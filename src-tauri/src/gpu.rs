// Port de get_gpu_info / nvidia_get_fan_info / nvidia_set_fan_speed / nvidia_set_fan_auto
// (backend/machctrl_server.py linhas 395-528)

use std::path::{Path, PathBuf};
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
    /// Frequência atual / máxima em MHz (Intel integrada: o sysfs não expõe % de uso)
    pub freq_mhz: Option<f64>,
    pub freq_max_mhz: Option<f64>,
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
            ..Default::default()
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
            ..Default::default()
        });
    }
    gpus
}

pub fn read_all_gpus() -> Vec<GpuInfo> {
    // Dedicadas primeiro: em notebook híbrido, gpus[0] é a que importa.
    let mut gpus = read_amd_gpus();
    gpus.extend(read_nvidia_gpus());
    gpus.extend(read_intel_gpus());
    gpus
}

fn read_num(p: &Path) -> Option<f64> {
    std::fs::read_to_string(p).ok()?.trim().parse::<f64>().ok()
}

/// Primeiro valor numérico que existir entre os caminhos candidatos.
/// i915 usa gt_*_freq_mhz; kernels novos movem para gt/gt0/rps_*; o driver xe usa tile0/gt0/freq0.
fn first_num(card: &Path, rels: &[&str]) -> Option<f64> {
    rels.iter().find_map(|r| read_num(&card.join(r)))
}

/// Intel integrada (ou Arc): detecta pelo vendor 0x8086 e lê as frequências do sysfs.
/// Não há "uso %" confiável sem perf/intel_gpu_top, então usage_pct fica None.
pub fn read_intel_gpus() -> Vec<GpuInfo> {
    read_intel_gpus_from(Path::new("/sys/class/drm"))
}

pub fn read_intel_gpus_from(root: &Path) -> Vec<GpuInfo> {
    let mut gpus = Vec::new();
    let Ok(entries) = std::fs::read_dir(root) else {
        return gpus;
    };
    let mut cards: Vec<PathBuf> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            let n = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
            n.starts_with("card") && !n.contains('-') // ignora cardN-HDMI-A-1 etc.
        })
        .collect();
    cards.sort();

    for (idx, card) in cards.iter().enumerate() {
        let vendor = std::fs::read_to_string(card.join("device/vendor")).unwrap_or_default();
        if vendor.trim() != "0x8086" {
            continue;
        }
        let freq_mhz = first_num(
            card,
            &["gt_act_freq_mhz", "gt/gt0/rps_act_freq_mhz", "device/tile0/gt0/freq0/cur_freq", "gt_cur_freq_mhz"],
        );
        let freq_max_mhz = first_num(
            card,
            &["gt_RP0_freq_mhz", "gt/gt0/rps_RP0_freq_mhz", "device/tile0/gt0/freq0/max_freq", "gt_max_freq_mhz"],
        )
        .filter(|m| *m > 0.0);
        gpus.push(GpuInfo {
            vendor: "intel".to_string(),
            index: idx as i32,
            name: "Intel Graphics".to_string(),
            freq_mhz,
            freq_max_mhz,
            ..Default::default()
        });
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn w(p: &Path, val: &str) {
        fs::create_dir_all(p.parent().unwrap()).unwrap();
        fs::write(p, format!("{val}\n")).unwrap();
    }

    fn fixture(tag: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("machctrl-gpu-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        root
    }

    // Estrutura do /sys/class/drm do notebook Dell (card1 = Intel, com gt_*_freq_mhz e conectores cardN-*).
    // Os valores de frequência são ilustrativos; os nomes dos arquivos vêm do notebook real.
    #[test]
    fn intel_igpu_i915() {
        let root = fixture("intel");
        w(&root.join("card1/device/vendor"), "0x8086");
        w(&root.join("card1/gt_act_freq_mhz"), "350");
        w(&root.join("card1/gt_cur_freq_mhz"), "400");
        w(&root.join("card1/gt_RP0_freq_mhz"), "700");
        w(&root.join("card1/gt_max_freq_mhz"), "700");
        fs::create_dir_all(root.join("card1-eDP-1")).unwrap();
        fs::create_dir_all(root.join("card1-HDMI-A-1")).unwrap();
        let g = read_intel_gpus_from(&root);
        assert_eq!(g.len(), 1, "conectores cardN-* não contam como GPU");
        assert_eq!(g[0].vendor, "intel");
        assert_eq!(g[0].freq_mhz, Some(350.0), "prefere a frequência real (act) à solicitada (cur)");
        assert_eq!(g[0].freq_max_mhz, Some(700.0));
        assert_eq!(g[0].usage_pct, None);
    }

    #[test]
    fn intel_falls_back_to_cur_freq() {
        let root = fixture("fallback");
        w(&root.join("card0/device/vendor"), "0x8086");
        w(&root.join("card0/gt_cur_freq_mhz"), "300");
        let g = read_intel_gpus_from(&root);
        assert_eq!(g[0].freq_mhz, Some(300.0));
        assert_eq!(g[0].freq_max_mhz, None);
    }

    #[test]
    fn amd_and_missing_dir_are_ignored() {
        let root = fixture("amd");
        w(&root.join("card0/device/vendor"), "0x1002");
        assert!(read_intel_gpus_from(&root).is_empty());
        assert!(read_intel_gpus_from(Path::new("/nonexistent-xyz")).is_empty());
    }
}
