// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cleaner;
mod fancontrol;
mod gpu;
mod hwmon;
mod memory;
mod procstat;
mod profiles;
mod tune;

use fancontrol::{CurvePoint, FanControl, FanMode, SharedFanController};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

// ---------------------------------------------------------------------------
// Estado compartilhado: guarda leituras anteriores pra calcular deltas
// (uso de CPU, taxa de rede, watts via RAPL) entre chamadas.
// ---------------------------------------------------------------------------

struct AppState {
    prev_cpu_overall: procstat::CpuTimes,
    prev_cpu_cores: HashMap<usize, procstat::CpuTimes>,
    prev_net: Vec<procstat::NetAdapter>,
    prev_disk_io: Vec<procstat::DiskIoCounters>,
    prev_disk_io_time: std::time::Instant,
}

impl Default for AppState {
    fn default() -> Self {
        let (overall, cores) = procstat::read_cpu_times();
        Self {
            prev_cpu_overall: overall,
            prev_cpu_cores: cores,
            prev_net: procstat::read_net_counters(),
            prev_disk_io: procstat::read_disk_io(),
            prev_disk_io_time: std::time::Instant::now(),
        }
    }
}

type SharedState = Mutex<AppState>;

// ---------------------------------------------------------------------------
// DTOs serializáveis (espelham os dados dos módulos, adicionando Serialize
// sem tocar nos módulos originais).
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct CoreDto {
    id: usize,
    pct: f32,
    temp_c: Option<f64>,
}

#[derive(Serialize)]
struct SocketDto {
    socket_id: usize,
    model: String,
    phys_cores: usize,
    threads: usize,
    freq_ghz: f64,
    usage_pct: f32,
    package_temp_c: Option<f64>,
    cores: Vec<CoreDto>,
}

#[derive(Serialize)]
struct GpuDto {
    name: String,
    vendor: String,
    usage_pct: Option<f64>,
    temp_c: Option<f64>,
    vram_used_mb: Option<f64>,
    vram_total_mb: Option<f64>,
    fan_pct: Option<i32>,
    fan_rpm: Option<i64>,
}

#[derive(Serialize)]
struct DiskDto {
    device: String,
    mountpoint: String,
    fstype: String,
    disk_type: String,
    total_gb: f64,
    used_gb: f64,
    free_gb: f64,
    usage_pct: f64,
    read_mbs: f64,
    write_mbs: f64,
}

#[derive(Serialize)]
struct NetDto {
    name: String,
    down_kb: f64,
    up_kb: f64,
}

#[derive(Serialize)]
struct ProcDto {
    pid: u32,
    name: String,
    rss_mb: f64,
}

#[derive(Serialize)]
struct SystemInfo {
    hostname: String,
    product_name: String,
    distro: String,
    uptime: String,
    cpu_model: String,
    kernel: String,
    motherboard: String,
    bios: String,
    install_date: String,
    storage_total_gb: f64,
    mem_total_gb: f64,
    gpu_name: String,
}

#[derive(Serialize)]
struct Snapshot {
    cpu_usage: f32,
    cpu_temp_c: Option<f64>,
    cpu_freq_mhz: u64,
    mem_used_gb: f64,
    mem_total_gb: f64,
    mem_pct: f64,
    gpus: Vec<GpuDto>,
    disks: Vec<DiskDto>,
    net: Vec<NetDto>,
    top_procs: Vec<ProcDto>,
    sockets: Vec<SocketDto>,
}

// ---------------------------------------------------------------------------
// Helpers de temperatura
// ---------------------------------------------------------------------------

/// Temperatura de pacote da CPU (Tctl/Tdie/Package), com fallback pro primeiro sensor.
fn cpu_package_temp(temps: &[hwmon::TempSensor]) -> Option<f64> {
    temps
        .iter()
        .find(|t| {
            let l = t.label.to_lowercase();
            l.contains("tctl") || l.contains("tdie") || l.contains("package")
        })
        .or_else(|| temps.first())
        .map(|t| t.value_c)
}

/// Temperatura de package POR SOCKET. O coretemp expõe um sensor rotulado
/// "Package id N" por CPU física — casamos o N com o socket_id. Se não houver
/// (label diferente), agrupamos os chips coretemp em ordem e usamos o i-ésimo.
fn package_temp_for_socket(temps: &[hwmon::TempSensor], socket_id: usize, socket_index: usize) -> Option<f64> {
    // 1) match direto pelo label "package id N"
    let target = format!("package id {socket_id}");
    if let Some(t) = temps.iter().find(|t| t.label.to_lowercase().trim() == target) {
        return Some(t.value_c);
    }
    // 2) fallback: i-ésimo chip coretemp (ordenado) com label de package
    let mut chips: Vec<&str> = temps
        .iter()
        .filter(|t| t.chip.to_lowercase().contains("coretemp"))
        .map(|t| t.chip.as_str())
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .collect();
    chips.sort();
    let chip = chips.get(socket_index)?;
    temps
        .iter()
        .find(|t| &t.chip == chip && t.label.to_lowercase().contains("package"))
        .or_else(|| temps.iter().find(|t| &t.chip == chip))
        .map(|t| t.value_c)
}

/// Mapeia sensores "Core N" para cada CPU lógico, ciente de múltiplos sockets.
fn build_core_temp_map(
    temps: &[hwmon::TempSensor],
    sockets: &[procstat::SocketInfo],
) -> HashMap<usize, f64> {
    let mut map: HashMap<usize, f64> = HashMap::new();
    let mut by_chip: HashMap<String, Vec<(usize, f64)>> = HashMap::new();
    for t in temps {
        if let Some(n) = t
            .label
            .to_lowercase()
            .strip_prefix("core ")
            .and_then(|s| s.trim().parse::<usize>().ok())
        {
            by_chip.entry(t.chip.clone()).or_default().push((n, t.value_c));
        }
    }
    if by_chip.is_empty() || sockets.is_empty() {
        return map;
    }
    let mut chips: Vec<(String, Vec<(usize, f64)>)> = by_chip.into_iter().collect();
    chips.sort_by(|a, b| a.0.cmp(&b.0));

    for (chip_idx, (_chip, mut core_temps)) in chips.into_iter().enumerate() {
        let Some(socket) = sockets.get(chip_idx).or_else(|| sockets.first()) else {
            continue;
        };
        core_temps.sort_by_key(|(n, _)| *n);
        if core_temps.is_empty() {
            continue;
        }
        let logical = &socket.logical_ids;
        let threads_per_core = (logical.len() / core_temps.len()).max(1);
        for (phys_idx, (_core_n, temp)) in core_temps.iter().enumerate() {
            for t in 0..threads_per_core {
                let pos = phys_idx * threads_per_core + t;
                if let Some(&logical_id) = logical.get(pos) {
                    map.insert(logical_id, *temp);
                }
            }
        }
    }
    map
}

// ---------------------------------------------------------------------------
// Comando principal: snapshot completo do sistema
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_snapshot(state: tauri::State<SharedState>) -> Snapshot {
    let mut st = state.lock().unwrap();

    // --- CPU (agregado) ---
    let (overall, cur_cores) = procstat::read_cpu_times();
    let cpu_usage = procstat::usage_pct(&st.prev_cpu_overall, &overall);

    // --- temperaturas / topologia ---
    let (temps, _fans) = hwmon::read_all_temps_and_fans();
    let sockets_info = procstat::read_cpu_topology();
    let core_temp_map = build_core_temp_map(&temps, &sockets_info);
    let pkg_temp = cpu_package_temp(&temps);

    // --- monta sockets DTO ---
    let sockets: Vec<SocketDto> = sockets_info
        .iter()
        .enumerate()
        .map(|(socket_index, s)| {
            let cores: Vec<CoreDto> = s
                .logical_ids
                .iter()
                .map(|&id| {
                    let cur = cur_cores.get(&id).copied().unwrap_or_default();
                    let prev = st.prev_cpu_cores.get(&id).copied().unwrap_or_default();
                    CoreDto {
                        id,
                        pct: procstat::usage_pct(&prev, &cur),
                        temp_c: core_temp_map.get(&id).copied(),
                    }
                })
                .collect();
            let usage = if cores.is_empty() {
                0.0
            } else {
                cores.iter().map(|c| c.pct).sum::<f32>() / cores.len() as f32
            };
            SocketDto {
                socket_id: s.socket_id,
                model: s.model.clone(),
                phys_cores: procstat::read_cpu_cores_for_socket(&s.logical_ids),
                threads: s.logical_ids.len(),
                freq_ghz: s.freq_mhz as f64 / 1000.0,
                usage_pct: usage,
                package_temp_c: package_temp_for_socket(&temps, s.socket_id, socket_index).or(pkg_temp),
                cores,
            }
        })
        .collect();

    // --- memória ---
    let mem = procstat::read_meminfo();

    // --- GPU ---
    let gpus: Vec<GpuDto> = gpu::read_all_gpus()
        .into_iter()
        .map(|g| GpuDto {
            name: g.name,
            vendor: g.vendor,
            usage_pct: g.usage_pct,
            temp_c: g.temp_c,
            vram_used_mb: g.vram_used_mb,
            vram_total_mb: g.vram_total_mb,
            fan_pct: g.fan_pct,
            fan_rpm: g.fan_rpm,
        })
        .collect();

    // --- discos + I/O (delta de /proc/diskstats) ---
    let cur_disk_io = procstat::read_disk_io();
    let io_dt = st.prev_disk_io_time.elapsed().as_secs_f64().max(0.001);
    let disks: Vec<DiskDto> = procstat::read_disks()
        .into_iter()
        .map(|d| {
            let base = procstat::disk_base_name(&d.device);
            let cur = cur_disk_io.iter().find(|c| c.device == base);
            let prev = st.prev_disk_io.iter().find(|c| c.device == base);
            let (read_mbs, write_mbs) = match (cur, prev) {
                (Some(c), Some(p)) => (
                    (c.read_bytes.saturating_sub(p.read_bytes)) as f64 / 1_048_576.0 / io_dt,
                    (c.write_bytes.saturating_sub(p.write_bytes)) as f64 / 1_048_576.0 / io_dt,
                ),
                _ => (0.0, 0.0),
            };
            DiskDto {
                device: d.device,
                mountpoint: d.mountpoint,
                fstype: d.fstype,
                disk_type: d.disk_type,
                total_gb: d.total_gb,
                used_gb: d.used_gb,
                free_gb: d.free_gb,
                usage_pct: d.usage_pct,
                read_mbs,
                write_mbs,
            }
        })
        .collect();

    // --- rede (delta) ---
    let cur_net = procstat::read_net_counters();
    let net: Vec<NetDto> = cur_net
        .iter()
        .map(|a| {
            let prev = st.prev_net.iter().find(|p| p.name == a.name);
            let (down_kb, up_kb) = match prev {
                Some(p) => (
                    a.rx_bytes.saturating_sub(p.rx_bytes) as f64 / 1024.0,
                    a.tx_bytes.saturating_sub(p.tx_bytes) as f64 / 1024.0,
                ),
                None => (0.0, 0.0),
            };
            NetDto {
                name: a.name.clone(),
                down_kb,
                up_kb,
            }
        })
        .collect();

    // --- top processos ---
    let top_procs: Vec<ProcDto> = procstat::top_processes_by_ram(10)
        .into_iter()
        .map(|p| ProcDto {
            pid: p.pid,
            name: p.name,
            rss_mb: p.rss_kb as f64 / 1024.0,
        })
        .collect();

    // --- watts (RAPL, delta interno) com fallback estimado ---
    // atualiza estado pra próximos deltas
    st.prev_cpu_overall = overall;
    st.prev_cpu_cores = cur_cores;
    st.prev_net = cur_net;
    st.prev_disk_io = cur_disk_io;
    st.prev_disk_io_time = std::time::Instant::now();

    Snapshot {
        cpu_usage,
        cpu_temp_c: pkg_temp,
        cpu_freq_mhz: procstat::read_cpu_freq_mhz(),
        mem_used_gb: mem.used_gb,
        mem_total_gb: mem.total_gb,
        mem_pct: mem.usage_pct,
        gpus,
        disks,
        net,
        top_procs,
        sockets,
    }
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mem = procstat::read_meminfo();
    let storage_total_gb: f64 = procstat::read_disks().iter().map(|d| d.total_gb).sum();
    let gpu_name = gpu::read_all_gpus()
        .first()
        .map(|g| g.name.clone())
        .unwrap_or_else(|| "Nenhuma GPU detectada".to_string());
    SystemInfo {
        hostname: procstat::read_hostname(),
        product_name: procstat::read_product_name(),
        distro: procstat::read_distro_name(),
        uptime: procstat::read_uptime_human(),
        cpu_model: procstat::read_cpu_model(),
        kernel: procstat::read_kernel_version(),
        motherboard: procstat::read_motherboard(),
        bios: procstat::read_bios(),
        install_date: procstat::read_install_date(),
        storage_total_gb,
        mem_total_gb: mem.total_gb,
        gpu_name,
    }
}

// ---------------------------------------------------------------------------
// Memória (slots DIMM)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct MemSlotDto {
    locator: String,
    size_gb: f64,
    mem_type: String,
    speed_mhz: i64,
    manufacturer: String,
    part_number: String,
    voltage: f64,
}

#[derive(Serialize)]
struct MemoryDto {
    total_slots: u32,
    occupied_slots: u32,
    slots: Vec<MemSlotDto>,
}

#[tauri::command]
fn get_memory_slots() -> MemoryDto {
    let mem = procstat::read_meminfo();
    let info = memory::get_memory_slots(mem.total_gb);
    mem_info_to_dto(info)
}

#[tauri::command]
fn get_memory_slots_root() -> MemoryDto {
    // Usa pkexec (prompt de senha). Se falhar/cancelar, cai na leitura normal.
    let info = memory::get_memory_slots_pkexec()
        .unwrap_or_else(|| {
            let mem = procstat::read_meminfo();
            memory::get_memory_slots(mem.total_gb)
        });
    mem_info_to_dto(info)
}

fn mem_info_to_dto(info: memory::MemorySlotsInfo) -> MemoryDto {
    MemoryDto {
        total_slots: info.total_slots,
        occupied_slots: info.occupied_slots,
        slots: info
            .slots
            .into_iter()
            .map(|s| MemSlotDto {
                locator: s.locator,
                size_gb: s.size_gb,
                mem_type: s.mem_type,
                speed_mhz: s.speed_mhz,
                manufacturer: s.manufacturer,
                part_number: s.part_number,
                voltage: s.voltage,
            })
            .collect(),
    }
}

// ---------------------------------------------------------------------------
// Fans
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct FanDto {
    id: String,
    label: String,
    rpm: i64,
    pct: i32,
    chip: String,
    controllable: bool,
    pwm_path: String,
    pwm_enable_path: Option<String>,
}

#[tauri::command]
fn get_fans() -> Vec<FanDto> {
    let (_temps, fans) = hwmon::read_all_temps_and_fans();
    fans.into_iter()
        .map(|f| FanDto {
            controllable: f.pwm_enable_path.is_some(),
            id: f.id,
            label: f.label,
            rpm: f.rpm,
            pct: f.pct,
            chip: f.chip,
            pwm_path: f.pwm_path,
            pwm_enable_path: f.pwm_enable_path,
        })
        .collect()
}

#[derive(Serialize)]
struct CurvePointOut {
    temp: f64,
    pct: f64,
}

#[derive(Serialize)]
struct FanModeDto {
    fan_id: String,
    mode: String,           // "auto" | "manual" | "max" | "curve"
    manual_pct: i32,
    curve: Vec<CurvePointOut>,
}

/// Retorna o modo atual de cada fan que o controlador está mantendo. O frontend
/// chama isso ao montar a tela pra restaurar o estado real (senão, ao sair e
/// voltar, mostraria "auto" mesmo com uma curva ativa por baixo).
#[tauri::command]
fn get_fan_modes(ctrl: tauri::State<SharedFanController>) -> Vec<FanModeDto> {
    let guard = ctrl.lock().unwrap();
    guard
        .fans
        .iter()
        .map(|(id, f)| FanModeDto {
            fan_id: id.clone(),
            mode: match f.mode {
                FanMode::Auto => "auto",
                FanMode::Manual => "manual",
                FanMode::Max => "max",
                FanMode::Curve => "curve",
            }
            .to_string(),
            manual_pct: f.manual_pct,
            curve: f.curve.iter().map(|p| CurvePointOut { temp: p.temp, pct: p.pct }).collect(),
        })
        .collect()
}

/// Detecta se um chip é de GPU pelo nome.
fn chip_is_gpu(chip: &str) -> bool {
    let c = chip.to_lowercase();
    c.contains("amdgpu") || c.contains("nvidia") || c.contains("radeon") || c.contains("nouveau")
}

/// Registra/atualiza um fan no controlador (cria a entrada se não existir).
fn upsert_fan<F: FnOnce(&mut FanControl)>(
    ctrl: &SharedFanController,
    fan_id: &str,
    pwm_path: &str,
    pwm_enable_path: &Option<String>,
    chip: &str,
    update: F,
) {
    let mut guard = ctrl.lock().unwrap();
    let entry = guard.fans.entry(fan_id.to_string()).or_insert_with(|| FanControl {
        pwm_path: pwm_path.to_string(),
        pwm_enable_path: pwm_enable_path.clone(),
        chip: chip.to_string(),
        mode: FanMode::Auto,
        manual_pct: 50,
        curve: Vec::new(),
        is_gpu: chip_is_gpu(chip),
    });
    // mantém caminhos atualizados
    entry.pwm_path = pwm_path.to_string();
    entry.pwm_enable_path = pwm_enable_path.clone();
    entry.chip = chip.to_string();
    entry.is_gpu = chip_is_gpu(chip);
    update(entry);
    // persiste no /etc/machctrl/fans.json pra o daemon aplicar e sobreviver a
    // reinícios (só funciona rodando como root; se falhar, ignora).
    fancontrol::save_config(&guard);
}

#[tauri::command]
fn set_fan(
    ctrl: tauri::State<SharedFanController>,
    fan_id: String,
    pwm_path: String,
    pwm_enable_path: Option<String>,
    chip: String,
    speed: i32,
    max: Option<bool>,
) -> Result<(), String> {
    let is_max = max.unwrap_or(false);
    // aplica imediatamente (feedback instantâneo) e registra o modo pra a thread reforçar
    hwmon::set_fan_speed(&pwm_path, pwm_enable_path.as_deref(), speed)?;
    upsert_fan(&ctrl, &fan_id, &pwm_path, &pwm_enable_path, &chip, |f| {
        f.mode = if is_max { FanMode::Max } else { FanMode::Manual };
        f.manual_pct = speed;
    });
    Ok(())
}

#[tauri::command]
fn set_fan_auto(
    ctrl: tauri::State<SharedFanController>,
    fan_id: String,
    pwm_path: String,
    pwm_enable_path: String,
    chip: String,
) -> Result<(), String> {
    // Tanto CPU quanto GPU em "auto" são controlados por SOFTWARE pela thread:
    // - CPU: SmartFan do nct6779 usa sensor errado
    // - GPU: o auto do driver oscila (27-49%); nossa curva padrão é suave
    // Só registramos o modo; a thread aplica a curva padrão continuamente.
    upsert_fan(&ctrl, &fan_id, &pwm_path, &Some(pwm_enable_path), &chip, |f| {
        f.mode = FanMode::Auto;
    });
    Ok(())
}

#[derive(Deserialize)]
struct CurvePointDto {
    temp: f64,
    pct: f64,
}

#[tauri::command]
fn set_fan_curve(
    ctrl: tauri::State<SharedFanController>,
    fan_id: String,
    pwm_path: String,
    pwm_enable_path: Option<String>,
    chip: String,
    points: Vec<CurvePointDto>,
) -> Result<(), String> {
    let curve: Vec<CurvePoint> = points.into_iter().map(|p| CurvePoint { temp: p.temp, pct: p.pct }).collect();
    upsert_fan(&ctrl, &fan_id, &pwm_path, &pwm_enable_path, &chip, |f| {
        f.mode = FanMode::Curve;
        f.curve = curve;
    });
    Ok(())
}

// ---------------------------------------------------------------------------
// Energia (perfis)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct ProfilesDto {
    current: String,
    available: Vec<String>,
    governor: String,
}

#[tauri::command]
fn get_profiles() -> ProfilesDto {
    let info = profiles::get_profiles_info();
    ProfilesDto {
        current: info.current_profile,
        available: info.available_profiles,
        governor: info.available_governors.first().cloned().unwrap_or_default(),
    }
}

#[tauri::command]
fn apply_profile(name: String) -> Result<(), String> {
    let info = profiles::get_profiles_info();
    profiles::apply_profile(&name, &info.available_governors, procstat::cpu_core_count())
}

// ---------------------------------------------------------------------------
// Limpeza
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct CleanTaskDto {
    id: String,
    label: String,
    description: String,
    needs_root: bool,
}

#[tauri::command]
fn get_clean_tasks() -> Vec<CleanTaskDto> {
    cleaner::get_available_clean_tasks()
        .into_iter()
        .map(|t| CleanTaskDto {
            id: t.id,
            label: t.label,
            description: t.description,
            needs_root: t.needs_root,
        })
        .collect()
}

#[derive(Serialize)]
struct CleanResultDto {
    ok: bool,
    result: String,
    cleaned: Option<String>,
    bytes: u64,
}

#[tauri::command]
fn run_clean(task_id: String) -> CleanResultDto {
    let r = cleaner::run_clean_task(&task_id);
    CleanResultDto {
        ok: r.success,
        result: r.result,
        cleaned: r.cleaned,
        bytes: r.bytes,
    }
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    // O app roda como root (sudo). Pra abrir o navegador na sessão gráfica do
    // usuário, rodamos como ele com as variáveis de sessão. Tentamos uma cadeia
    // de openers que inclui navegadores nativos E Flatpak (que não têm binário
    // 'firefox' no PATH — são 'flatpak run org.mozilla.firefox').
    let real_user = std::env::var("SUDO_USER").ok().filter(|u| !u.is_empty() && u != "root");

    let uid = real_user
        .as_ref()
        .and_then(|user| {
            std::process::Command::new("id")
                .args(["-u", user])
                .output()
                .ok()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        })
        .unwrap_or_default();

    let display = std::env::var("DISPLAY").unwrap_or_else(|_| ":0".to_string());
    let wayland = std::env::var("WAYLAND_DISPLAY").unwrap_or_default();
    let runtime_dir = format!("/run/user/{uid}");
    let dbus = format!("unix:path=/run/user/{uid}/bus");

    // Roda um comando (com seus args) como o usuário real, com o ambiente
    // gráfico da sessão dele. Retorna true se o processo não morreu na hora.
    let run_as_user = |cmd_args: &[&str]| -> bool {
        let mut full: Vec<String> = Vec::new();
        let program = if real_user.is_some() {
            let user = real_user.as_ref().unwrap();
            full.extend([
                "-u".into(), user.clone(), "env".into(),
                format!("DISPLAY={display}"),
                format!("WAYLAND_DISPLAY={wayland}"),
                format!("XDG_RUNTIME_DIR={runtime_dir}"),
                format!("DBUS_SESSION_BUS_ADDRESS={dbus}"),
            ]);
            full.extend(cmd_args.iter().map(|s| s.to_string()));
            "sudo"
        } else {
            full.extend(cmd_args.iter().map(|s| s.to_string()));
            // sem sudo: o primeiro item é o programa
            cmd_args.first().copied().unwrap_or("")
        };
        let spawn_args: Vec<&str> = if real_user.is_some() {
            full.iter().map(|s| s.as_str()).collect()
        } else {
            full.iter().skip(1).map(|s| s.as_str()).collect()
        };
        if let Ok(mut child) = std::process::Command::new(program).args(&spawn_args).spawn() {
            std::thread::sleep(std::time::Duration::from_millis(400));
            match child.try_wait() {
                Ok(Some(status)) if !status.success() => false,
                _ => true,
            }
        } else {
            false
        }
    };

    // 1) Tenta o navegador PADRÃO do usuário (via xdg-settings). Se for um
    // .desktop Flatpak (ex: com.google.Chrome.desktop), roda via flatpak run.
    // ATENÇÃO: em sistemas com KDE quebrado (falta kreadconfig/qtpaths), o
    // xdg-settings pode retornar lixo (ex: 'micro.desktop', um editor!). Por
    // isso só confiamos se o resultado PARECER um navegador.
    let looks_like_browser = |s: &str| -> bool {
        let l = s.to_lowercase();
        ["chrome", "chromium", "firefox", "brave", "vivaldi", "edge", "opera",
         "epiphany", "browser", "webkit", "falkon", "librewolf", "waterfox"]
            .iter()
            .any(|b| l.contains(b))
    };
    let default_browser = std::process::Command::new("sudo")
        .args(["-u", real_user.as_deref().unwrap_or("root"), "env",
            &format!("XDG_RUNTIME_DIR={runtime_dir}"),
            &format!("DBUS_SESSION_BUS_ADDRESS={dbus}"),
            "xdg-settings", "get", "default-web-browser"])
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .filter(|s| !s.is_empty() && looks_like_browser(s));
    if let Some(desktop) = &default_browser {
        // se for Flatpak (.desktop com app-id estilo com.google.Chrome)
        let app_id = desktop.trim_end_matches(".desktop");
        if app_id.contains('.') && app_id.split('.').count() >= 3 {
            if run_as_user(&["flatpak", "run", app_id, &url]) {
                return Ok(());
            }
        }
    }

    // 2) Navegadores instalados via Flatpak (flatpak run <app-id> <url>).
    // Colocado ANTES dos openers genéricos porque no sistema do usuário o
    // xdg-open/gio estão baguncados (mandam URL pro editor de texto).
    for app_id in ["com.google.Chrome", "org.mozilla.firefox", "org.chromium.Chromium",
                   "com.brave.Browser", "com.vivaldi.Vivaldi", "com.microsoft.Edge",
                   "com.opera.Opera", "org.gnome.Epiphany"] {
        if flatpak_app_installed(&real_user, &runtime_dir, &dbus, app_id)
            && run_as_user(&["flatpak", "run", app_id, &url])
        {
            return Ok(());
        }
    }

    // 3) Navegadores nativos diretos.
    for browser in ["firefox", "chromium", "google-chrome-stable", "google-chrome",
                    "vivaldi-stable", "vivaldi", "brave", "microsoft-edge-stable", "opera"] {
        if run_as_user(&[browser, &url]) {
            return Ok(());
        }
    }

    // 4) Por último, openers genéricos (podem estar quebrados, mas tentamos).
    for opener in [["gio", "open"], ["xdg-open", ""], ["kde-open", ""], ["kde-open5", ""]] {
        let mut cmd: Vec<&str> = vec![opener[0]];
        if !opener[1].is_empty() { cmd.push(opener[1]); }
        cmd.push(&url);
        if run_as_user(&cmd) {
            return Ok(());
        }
    }

    Err("não foi possível abrir o navegador".to_string())
}

/// Verifica se um app Flatpak está instalado (pra não tentar rodar um que não existe).
fn flatpak_app_installed(
    real_user: &Option<String>,
    runtime_dir: &str,
    dbus: &str,
    app_id: &str,
) -> bool {
    std::process::Command::new("sudo")
        .args(["-u", real_user.as_deref().unwrap_or("root"), "env",
            &format!("XDG_RUNTIME_DIR={runtime_dir}"),
            &format!("DBUS_SESSION_BUS_ADDRESS={dbus}"),
            "flatpak", "info", app_id])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Verifica se o serviço machctrld está ativo (pra o app não brigar pelo PWM).
fn daemon_is_running() -> bool {
    std::process::Command::new("systemctl")
        .args(["is-active", "--quiet", "machctrld.service"])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Caminho do arquivo de preferências de UI (tema, idioma). Fica no HOME do
/// usuário real (não do root), já que o app roda elevado via sudo.
fn ui_prefs_path() -> std::path::PathBuf {
    // Descobre o home do usuário original (SUDO_USER), senão usa HOME.
    let home = std::env::var("SUDO_USER")
        .ok()
        .and_then(|user| {
            std::process::Command::new("getent")
                .args(["passwd", &user])
                .output()
                .ok()
                .and_then(|o| {
                    let s = String::from_utf8_lossy(&o.stdout);
                    s.split(':').nth(5).map(|h| h.to_string())
                })
        })
        .or_else(|| std::env::var("HOME").ok())
        .unwrap_or_else(|| "/root".to_string());
    std::path::PathBuf::from(home).join(".config/machctrl/ui.json")
}

#[tauri::command]
fn load_ui_prefs() -> String {
    std::fs::read_to_string(ui_prefs_path()).unwrap_or_else(|_| "{}".to_string())
}

#[tauri::command]
fn save_ui_prefs(prefs: String) -> Result<(), String> {
    let path = ui_prefs_path();
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    std::fs::write(&path, prefs).map_err(|e| format!("erro ao salvar preferências: {e}"))?;
    // garante que o arquivo pertença ao usuário real, não ao root
    if let Ok(user) = std::env::var("SUDO_USER") {
        let _ = std::process::Command::new("chown")
            .args(["-R", &format!("{user}:{user}"), &path.parent().unwrap().to_string_lossy()])
            .status();
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Ajustes de sistema (tela Ajuste)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct TuneState {
    swappiness: Option<i32>,
    cache_pressure: Option<i32>,
    dirty_ratio: Option<i32>,
    dirty_bg_ratio: Option<i32>,
    thp: Option<String>,
    io_schedulers: Vec<tune::DiskScheduler>,
    services: Vec<tune::ServiceState>,
    network: tune::NetworkState,
    has_cpupower: bool,
    has_ananicy: bool,
    has_zram: bool,
}

#[tauri::command]
fn get_tune_state() -> TuneState {
    // serviços de interesse — só os que existirem aparecem no frontend
    let service_names = ["ananicy-cpp", "irqbalance", "bluetooth", "cups", "tlp", "fstrim.timer"];
    let services: Vec<tune::ServiceState> = service_names
        .iter()
        .map(|s| tune::get_service(s))
        .filter(|s| s.exists)
        .collect();

    TuneState {
        swappiness: tune::get_swappiness(),
        cache_pressure: tune::get_cache_pressure(),
        dirty_ratio: tune::get_dirty_ratio(),
        dirty_bg_ratio: tune::get_dirty_bg_ratio(),
        thp: tune::get_thp(),
        io_schedulers: tune::get_io_schedulers(),
        services,
        network: tune::get_network_state(),
        has_cpupower: tune::command_exists("cpupower"),
        has_ananicy: tune::command_exists("ananicy-cpp"),
        has_zram: tune::command_exists("zramctl"),
    }
}

#[tauri::command]
fn set_congestion_control(algo: String) -> Result<(), String> {
    tune::set_congestion_control(&algo)
}

#[tauri::command]
fn set_dirty_ratio(value: i32) -> Result<(), String> {
    tune::set_dirty_ratio(value)
}

#[tauri::command]
fn set_dirty_bg_ratio(value: i32) -> Result<(), String> {
    tune::set_dirty_bg_ratio(value)
}

#[tauri::command]
fn set_swappiness(value: i32) -> Result<(), String> {
    tune::set_swappiness(value)
}

#[tauri::command]
fn set_cache_pressure(value: i32) -> Result<(), String> {
    tune::set_cache_pressure(value)
}

#[tauri::command]
fn set_thp(mode: String) -> Result<(), String> {
    tune::set_thp(&mode)
}

#[tauri::command]
fn set_io_scheduler(device: String, scheduler: String) -> Result<(), String> {
    tune::set_io_scheduler(&device, &scheduler)
}

#[tauri::command]
fn set_service(name: String, enable: bool) -> Result<(), String> {
    tune::set_service(&name, enable)
}

fn main() {
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_SKIA_ENABLE_CPU_RENDERING").is_none() {
        std::env::set_var("WEBKIT_SKIA_ENABLE_CPU_RENDERING", "1");
    }

    // Carrega as configs salvas (curvas/modos definidos anteriormente).
    let fan_ctrl: SharedFanController = Arc::new(Mutex::new(fancontrol::load_config()));

    // Se o daemon (machctrld) NÃO estiver rodando, o app assume o controle dos
    // fans com sua própria thread. Se o daemon estiver ativo, deixamos ele
    // controlar (evita duas threads brigando pelo PWM) — o app só edita a config.
    if !daemon_is_running() {
        fancontrol::spawn_control_thread(fan_ctrl.clone());
    }

    tauri::Builder::default()
        .manage(SharedState::default())
        .manage(fan_ctrl)
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            get_system_info,
            get_memory_slots,
            get_memory_slots_root,
            get_fans,
            get_fan_modes,
            set_fan,
            set_fan_auto,
            set_fan_curve,
            get_profiles,
            apply_profile,
            get_clean_tasks,
            run_clean,
            open_url,
            load_ui_prefs,
            save_ui_prefs,
            get_tune_state,
            set_swappiness,
            set_cache_pressure,
            set_thp,
            set_io_scheduler,
            set_service,
            set_congestion_control,
            set_dirty_ratio,
            set_dirty_bg_ratio,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o MachCtrl");
}
