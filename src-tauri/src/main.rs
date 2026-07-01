// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cleaner;
mod gpu;
mod hwmon;
mod memory;
mod power;
mod procstat;
mod profiles;

use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// Estado compartilhado: guarda leituras anteriores pra calcular deltas
// (uso de CPU, taxa de rede, watts via RAPL) entre chamadas.
// ---------------------------------------------------------------------------

struct AppState {
    prev_cpu_overall: procstat::CpuTimes,
    prev_cpu_cores: HashMap<usize, procstat::CpuTimes>,
    prev_net: Vec<procstat::NetAdapter>,
    rapl: power::RaplReader,
}

impl Default for AppState {
    fn default() -> Self {
        let (overall, cores) = procstat::read_cpu_times();
        Self {
            prev_cpu_overall: overall,
            prev_cpu_cores: cores,
            prev_net: procstat::read_net_counters(),
            rapl: power::RaplReader::new(),
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
}

#[derive(Serialize)]
struct DiskDto {
    mountpoint: String,
    fstype: String,
    total_gb: f64,
    used_gb: f64,
    free_gb: f64,
    usage_pct: f64,
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
    distro: String,
    uptime: String,
    cpu_model: String,
}

#[derive(Serialize)]
struct Snapshot {
    cpu_usage: f32,
    cpu_temp_c: Option<f64>,
    cpu_freq_mhz: u64,
    cpu_watts: Option<f64>,
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
        .map(|s| {
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
                package_temp_c: pkg_temp,
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
        })
        .collect();

    // --- discos ---
    let disks: Vec<DiskDto> = procstat::read_disks()
        .into_iter()
        .map(|d| DiskDto {
            mountpoint: d.mountpoint,
            fstype: d.fstype,
            total_gb: d.total_gb,
            used_gb: d.used_gb,
            free_gb: d.free_gb,
            usage_pct: d.usage_pct,
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

    // --- watts (RAPL, delta interno) ---
    let cpu_watts = st.rapl.read_watts();

    // atualiza estado pra próximos deltas
    st.prev_cpu_overall = overall;
    st.prev_cpu_cores = cur_cores;
    st.prev_net = cur_net;

    Snapshot {
        cpu_usage,
        cpu_temp_c: pkg_temp,
        cpu_freq_mhz: procstat::read_cpu_freq_mhz(),
        cpu_watts,
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
    SystemInfo {
        hostname: procstat::read_hostname(),
        distro: procstat::read_distro_name(),
        uptime: procstat::read_uptime_human(),
        cpu_model: procstat::read_cpu_model(),
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
    voltage: f64,
}

#[tauri::command]
fn get_memory_slots() -> Vec<MemSlotDto> {
    let mem = procstat::read_meminfo();
    memory::get_memory_slots(mem.total_gb)
        .slots
        .into_iter()
        .map(|s| MemSlotDto {
            locator: s.locator,
            size_gb: s.size_gb,
            mem_type: s.mem_type,
            speed_mhz: s.speed_mhz,
            manufacturer: s.manufacturer,
            voltage: s.voltage,
        })
        .collect()
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

#[tauri::command]
fn set_fan(pwm_path: String, pwm_enable_path: Option<String>, speed: i32) -> Result<(), String> {
    hwmon::set_fan_speed(&pwm_path, pwm_enable_path.as_deref(), speed)
}

#[tauri::command]
fn set_fan_auto(pwm_enable_path: String) -> Result<(), String> {
    hwmon::set_fan_auto(&pwm_enable_path)
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
}

#[tauri::command]
fn run_clean(task_id: String) -> CleanResultDto {
    let r = cleaner::run_clean_task(&task_id);
    CleanResultDto {
        ok: r.success,
        result: r.result,
        cleaned: r.cleaned,
    }
}

fn main() {
    tauri::Builder::default()
        .manage(SharedState::default())
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            get_system_info,
            get_memory_slots,
            get_fans,
            set_fan,
            set_fan_auto,
            get_profiles,
            apply_profile,
            get_clean_tasks,
            run_clean,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o MachCtrl");
}
