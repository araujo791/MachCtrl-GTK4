// Port de get_gpu_info / nvidia_get_fan_info / nvidia_set_fan_speed / nvidia_set_fan_auto
// (backend/machctrl_server.py linhas 395-528)

use std::process::Command;

#[derive(Clone, Debug, Default)]
pub struct GpuInfo {
    pub vendor: String, // "amd" | "nvidia"
    pub index: i32,
    pub name: String,
    pub temp_c: Option<f64>,
    pub fan_pct: Option<i32>,
    pub fan_rpm: Option<i64>,
    pub usage_pct: Option<f64>,
    pub vram_used_mb: Option<f64>,
    pub vram_total_mb: Option<f64>,
}

/// AMD: lê via /sys/class/drm/cardN/device/ (hwmon1/temp1_input, gpu_busy_percent, etc.)
/// Mais simples e direto que recriar parsing de `rocm-smi`, igual à filosofia atual do
/// backend Python, que também lê hwmon diretamente para AMD.
pub fn read_amd_gpus() -> Vec<GpuInfo> {
    let mut gpus = Vec::new();
    let Ok(entries) = std::fs::read_dir("/sys/class/drm") else {
        return gpus;
    };

    let mut cards: Vec<_> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .chars()
                .collect::<String>()
                .starts_with("card")
                && !e.file_name().to_string_lossy().contains('-') // ignora cardN-HDMI-A-1 etc.
        })
        .collect();
    cards.sort_by_key(|e| e.file_name());

    for (idx, card) in cards.iter().enumerate() {
        let device_path = card.path().join("device");
        let vendor_path = device_path.join("vendor");
        let Ok(vendor) = std::fs::read_to_string(&vendor_path) else {
            continue;
        };
        // 0x1002 == AMD/ATI
        if vendor.trim() != "0x1002" {
            continue;
        }

        let busy = std::fs::read_to_string(device_path.join("gpu_busy_percent"))
            .ok()
            .and_then(|s| s.trim().parse::<f64>().ok());

        // VRAM: mem_info_vram_used / mem_info_vram_total (bytes) em sysfs do amdgpu
        let vram_used_mb = std::fs::read_to_string(device_path.join("mem_info_vram_used"))
            .ok()
            .and_then(|s| s.trim().parse::<f64>().ok())
            .map(|b| b / 1_048_576.0);
        let vram_total_mb = std::fs::read_to_string(device_path.join("mem_info_vram_total"))
            .ok()
            .and_then(|s| s.trim().parse::<f64>().ok())
            .map(|b| b / 1_048_576.0);

        // Temperatura: procura hwmon dentro de device/hwmon/hwmonX/temp1_input
        let mut temp_c = None;
        let mut fan_rpm = None;
        let mut fan_pct = None;
        if let Ok(hwmons) = std::fs::read_dir(device_path.join("hwmon")) {
            for hwmon in hwmons.filter_map(|e| e.ok()) {
                let p = hwmon.path();
                if let Ok(raw) = std::fs::read_to_string(p.join("temp1_input")) {
                    temp_c = raw.trim().parse::<f64>().ok().map(|v| v / 1000.0);
                }
                if let Ok(raw) = std::fs::read_to_string(p.join("fan1_input")) {
                    fan_rpm = raw.trim().parse::<i64>().ok();
                }
                if let Ok(raw) = std::fs::read_to_string(p.join("pwm1")) {
                    fan_pct = raw
                        .trim()
                        .parse::<f64>()
                        .ok()
                        .map(|v| ((v / 255.0) * 100.0).round() as i32);
                }
            }
        }

        gpus.push(GpuInfo {
            vendor: "amd".to_string(),
            index: idx as i32,
            name: "AMD GPU".to_string(), // refinar com pci.ids se necessário
            temp_c,
            fan_pct,
            fan_rpm,
            usage_pct: busy,
            vram_used_mb,
            vram_total_mb,
        });
    }
    gpus
}

/// NVIDIA: mesma estratégia do Python — chama `nvidia-smi` como subprocesso.
/// Mantemos a dependência externa de propósito (driver proprietário não expõe
/// tudo via sysfs de forma confiável).
pub fn read_nvidia_gpus() -> Vec<GpuInfo> {
    let output = Command::new("nvidia-smi")
        .args([
            "--query-gpu=index,fan.speed,temperature.gpu,name,utilization.gpu,memory.used,memory.total",
            "--format=csv,noheader,nounits",
        ])
        .output();

    let Ok(output) = output else { return Vec::new() };
    if !output.status.success() {
        return Vec::new();
    }
    let stdout = String::from_utf8_lossy(&output.stdout);

    let mut gpus = Vec::new();
    for line in stdout.lines() {
        let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
        if parts.len() < 7 {
            continue;
        }
        let Ok(index) = parts[0].parse::<i32>() else { continue };
        let fan_pct = parts[1].parse::<i32>().ok();
        let temp_c = parts[2].parse::<f64>().ok();
        let name = parts[3].to_string();
        let usage_pct = parts[4].parse::<f64>().ok();
        let vram_used_mb = parts[5].parse::<f64>().ok();
        let vram_total_mb = parts[6].parse::<f64>().ok();

        gpus.push(GpuInfo {
            vendor: "nvidia".to_string(),
            index,
            name,
            temp_c,
            fan_pct,
            fan_rpm: None, // nvidia-smi não expõe RPM, só %, igual ao backend Python
            usage_pct,
            vram_used_mb,
            vram_total_mb,
        });
    }
    gpus
}

pub fn read_all_gpus() -> Vec<GpuInfo> {
    let mut gpus = read_amd_gpus();
    gpus.extend(read_nvidia_gpus());
    gpus
}

/// Equivalente a nvidia_set_fan_speed(): habilita controle manual e define velocidade.
pub fn nvidia_set_fan_speed(gpu_index: i32, speed_pct: i32) -> Result<(), String> {
    let speed_pct = speed_pct.clamp(0, 100);
    let _ = run_with_timeout("nvidia-smi", &["-i", &gpu_index.to_string(), "--fan-control=1"]);

    let r = run_with_timeout(
        "nvidia-smi",
        &[
            "-i",
            &gpu_index.to_string(),
            &format!("--assign-gpu-fan-speed=0={speed_pct}"),
        ],
    )?;
    if r.status.success() {
        return Ok(());
    }

    // Fallback: nvidia-settings (requer ambiente gráfico, igual ao Python)
    let r2 = Command::new("nvidia-settings")
        .args([
            "-a",
            &format!("[gpu:{gpu_index}]/GPUFanControlState=1"),
            "-a",
            &format!("[fan:{gpu_index}]/GPUTargetFanSpeed={speed_pct}"),
        ])
        .env("DISPLAY", ":0")
        .output()
        .map_err(|e| e.to_string())?;

    if r2.status.success() {
        Ok(())
    } else {
        Err("nvidia-smi e nvidia-settings falharam ao definir fan speed".to_string())
    }
}

/// Equivalente a nvidia_set_fan_auto(): restaura controle automático.
pub fn nvidia_set_fan_auto(gpu_index: i32) -> Result<(), String> {
    let r = run_with_timeout("nvidia-smi", &["-i", &gpu_index.to_string(), "--fan-control=0"])?;
    if r.status.success() {
        return Ok(());
    }
    let r2 = Command::new("nvidia-settings")
        .args(["-a", &format!("[gpu:{gpu_index}]/GPUFanControlState=0")])
        .env("DISPLAY", ":0")
        .output()
        .map_err(|e| e.to_string())?;
    if r2.status.success() {
        Ok(())
    } else {
        Err("nvidia-smi e nvidia-settings falharam ao restaurar modo automático".to_string())
    }
}

fn run_with_timeout(cmd: &str, args: &[&str]) -> Result<std::process::Output, String> {
    Command::new(cmd).args(args).output().map_err(|e| e.to_string())
}
