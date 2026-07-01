// Leitura de métricas básicas direto de /proc, evitando a crate `sysinfo` (que nas tentativas
// anteriores trouxe `rayon-core`, exigindo Rust 1.80+ — problema de toolchain que preferimos
// não herdar aqui). /proc é estável e documentado desde sempre no kernel Linux.

use std::collections::HashMap;
use std::fs;
use std::process::Command;

#[derive(Clone, Copy, Default)]
pub struct CpuTimes {
    pub user: u64,
    pub nice: u64,
    pub system: u64,
    pub idle: u64,
    pub iowait: u64,
    pub irq: u64,
    pub softirq: u64,
    pub steal: u64,
}

impl CpuTimes {
    fn total(&self) -> u64 {
        self.user + self.nice + self.system + self.idle + self.iowait + self.irq + self.softirq + self.steal
    }
    fn busy(&self) -> u64 {
        self.total() - self.idle - self.iowait
    }
}

fn parse_cpu_line(fields: &[&str]) -> CpuTimes {
    let get = |i: usize| fields.get(i).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
    CpuTimes {
        user: get(0),
        nice: get(1),
        system: get(2),
        idle: get(3),
        iowait: get(4),
        irq: get(5),
        softirq: get(6),
        steal: get(7),
    }
}

/// Lê /proc/stat: retorna (linha agregada "cpu", mapa core_id -> linha "cpuN").
pub fn read_cpu_times() -> (CpuTimes, HashMap<usize, CpuTimes>) {
    let mut overall = CpuTimes::default();
    let mut per_core = HashMap::new();

    let Ok(content) = fs::read_to_string("/proc/stat") else {
        return (overall, per_core);
    };

    for line in content.lines() {
        if !line.starts_with("cpu") {
            continue;
        }
        let mut parts = line.split_whitespace();
        let Some(tag) = parts.next() else { continue };
        let fields: Vec<&str> = parts.collect();

        if tag == "cpu" {
            overall = parse_cpu_line(&fields);
        } else if let Some(idx_str) = tag.strip_prefix("cpu") {
            if let Ok(idx) = idx_str.parse::<usize>() {
                per_core.insert(idx, parse_cpu_line(&fields));
            }
        }
    }
    (overall, per_core)
}

/// Percentual de uso entre duas leituras (delta de "tempo ocupado" / delta total).
pub fn usage_pct(prev: &CpuTimes, cur: &CpuTimes) -> f32 {
    let total_delta = cur.total().saturating_sub(prev.total());
    if total_delta == 0 {
        return 0.0;
    }
    let busy_delta = cur.busy().saturating_sub(prev.busy());
    ((busy_delta as f64 / total_delta as f64) * 100.0).clamp(0.0, 100.0) as f32
}

pub fn read_cpu_model() -> String {
    fs::read_to_string("/proc/cpuinfo")
        .ok()
        .and_then(|s| {
            s.lines()
                .find(|l| l.starts_with("model name"))
                .and_then(|l| l.split(':').nth(1))
                .map(|s| s.trim().to_string())
        })
        .unwrap_or_else(|| "CPU desconhecida".to_string())
}

pub fn read_cpu_freq_mhz() -> u64 {
    fs::read_to_string("/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq")
        .ok()
        .and_then(|s| s.trim().parse::<u64>().ok())
        .map(|khz| khz / 1000)
        .or_else(|| {
            fs::read_to_string("/proc/cpuinfo").ok().and_then(|s| {
                s.lines()
                    .find(|l| l.starts_with("cpu MHz"))
                    .and_then(|l| l.split(':').nth(1))
                    .and_then(|s| s.trim().parse::<f64>().ok())
                    .map(|mhz| mhz as u64)
            })
        })
        .unwrap_or(0)
}

pub fn cpu_core_count() -> usize {
    fs::read_to_string("/proc/cpuinfo")
        .map(|s| s.lines().filter(|l| l.starts_with("processor")).count())
        .unwrap_or(1)
        .max(1)
}

#[derive(Default, Clone, Copy)]
pub struct MemInfo {
    pub total_gb: f64,
    pub used_gb: f64,
    pub available_gb: f64,
    pub usage_pct: f64,
}

pub fn read_meminfo() -> MemInfo {
    let Ok(content) = fs::read_to_string("/proc/meminfo") else {
        return MemInfo::default();
    };
    let mut total_kb = 0u64;
    let mut available_kb = 0u64;
    for line in content.lines() {
        if line.starts_with("MemTotal:") {
            total_kb = line.split_whitespace().nth(1).and_then(|s| s.parse().ok()).unwrap_or(0);
        } else if line.starts_with("MemAvailable:") {
            available_kb = line.split_whitespace().nth(1).and_then(|s| s.parse().ok()).unwrap_or(0);
        }
    }
    let total_gb = total_kb as f64 / 1_048_576.0;
    let available_gb = available_kb as f64 / 1_048_576.0;
    let used_gb = (total_gb - available_gb).max(0.0);
    MemInfo {
        total_gb,
        used_gb,
        available_gb,
        usage_pct: if total_gb > 0.0 { (used_gb / total_gb) * 100.0 } else { 0.0 },
    }
}

#[derive(Clone)]
pub struct DiskInfo {
    pub device: String,     // ex: /dev/nvme0n1p2
    pub mountpoint: String,
    pub fstype: String,
    pub disk_type: String,  // "nvme" | "ssd" | "hdd" | "usb"
    pub total_gb: f64,
    pub used_gb: f64,
    pub free_gb: f64,
    pub usage_pct: f64,
}

/// Descobre o tipo físico de um device de bloco (nvme/ssd/hdd/usb) via sysfs.
/// - NVMe: nome começa com "nvme"
/// - USB: o caminho do device em /sys aponta pra um barramento usb
/// - SSD vs HDD: /sys/block/<disk>/queue/rotational (0 = SSD, 1 = HDD)
fn detect_disk_type(device: &str) -> String {
    // extrai o nome do disco base (nvme0n1p2 -> nvme0n1, sda1 -> sda)
    let dev_name = device.trim_start_matches("/dev/");
    let base = if dev_name.starts_with("nvme") {
        // nvme0n1p2 -> nvme0n1
        dev_name.split('p').next().unwrap_or(dev_name).to_string()
    } else {
        // sda1 -> sda ; remove dígitos finais
        dev_name.trim_end_matches(|c: char| c.is_ascii_digit()).to_string()
    };

    if base.starts_with("nvme") {
        return "nvme".to_string();
    }

    // USB? Verifica se o link real do device passa por um controlador usb
    if let Ok(link) = fs::read_link(format!("/sys/block/{base}")) {
        if link.to_string_lossy().contains("usb") {
            return "usb".to_string();
        }
    }

    // rotational: 0 = SSD, 1 = HDD
    match fs::read_to_string(format!("/sys/block/{base}/queue/rotational")) {
        Ok(v) if v.trim() == "0" => "ssd".to_string(),
        Ok(v) if v.trim() == "1" => "hdd".to_string(),
        _ => "hdd".to_string(),
    }
}

/// Usa `df` (sempre presente em qualquer Linux) em vez de reimplementar parsing de
/// statvfs/mountinfo na mão — igual ao espírito do cleaner.rs, que já shella pra `du`.
pub fn read_disks() -> Vec<DiskInfo> {
    let output = Command::new("df").args(["-B1", "--output=source,target,fstype,size,used,avail"]).output();
    let Ok(output) = output else { return Vec::new() };
    let stdout = String::from_utf8_lossy(&output.stdout);

    stdout
        .lines()
        .skip(1) // cabeçalho
        .filter_map(|line| {
            let f: Vec<&str> = line.split_whitespace().collect();
            if f.len() < 6 {
                return None;
            }
            let device = f[0].to_string();
            let mountpoint = f[1].to_string();
            // ignora pseudo-filesystems (tmpfs, devtmpfs, proc, sysfs, overlay de containers etc.)
            // Bloqueia caminhos de sistema, MAS permite mídia externa montada pelo
            // desktop em /run/media/<user>/... (pendrives, HDDs externos no KDE/GNOME).
            let is_removable_media = mountpoint.starts_with("/run/media/") || mountpoint.starts_with("/media/") || mountpoint.starts_with("/mnt/");
            if !mountpoint.starts_with('/')
                || mountpoint.starts_with("/sys")
                || mountpoint.starts_with("/proc")
                || mountpoint.starts_with("/dev/")
                || mountpoint == "/dev"
                || (mountpoint.starts_with("/run") && !is_removable_media)
            {
                return None;
            }
            let fstype = f[2].to_string();
            // fuseblk é usado por discos reais (NTFS/exFAT externos), então NÃO bloqueamos.
            // Só barramos fuse.* virtuais (rclone, sshfs, etc.) que não são hardware local.
            let is_virtual_fuse = fstype.starts_with("fuse.") || fstype == "fuse";
            if matches!(fstype.as_str(), "tmpfs" | "devtmpfs" | "squashfs" | "overlay" | "proc" | "sysfs" | "cgroup2")
                || is_virtual_fuse
                || fstype == "nfs"
                || fstype == "nfs4"
                || fstype == "cifs"
                || fstype == "autofs"
            {
                return None;
            }
            let total_b: f64 = f[3].parse().ok()?;
            let used_b: f64 = f[4].parse().ok()?;
            let free_b: f64 = f[5].parse().ok()?;
            let disk_type = detect_disk_type(&device);
            Some(DiskInfo {
                device,
                mountpoint,
                fstype,
                disk_type,
                total_gb: total_b / 1_073_741_824.0,
                used_gb: used_b / 1_073_741_824.0,
                free_gb: free_b / 1_073_741_824.0,
                usage_pct: if total_b > 0.0 { (used_b / total_b) * 100.0 } else { 0.0 },
            })
        })
        .collect()
}

// ---------------------------------------------------------------------------
// I/O de disco (leitura/escrita) via /proc/diskstats
// ---------------------------------------------------------------------------

#[derive(Clone, Default)]
pub struct DiskIoCounters {
    pub device: String,      // nome base, ex: nvme0n1, sda
    pub read_bytes: u64,
    pub write_bytes: u64,
}

/// Lê /proc/diskstats e retorna bytes lidos/escritos acumulados por device físico.
/// Campos relevantes (por linha): col 3 = nome, col 6 = setores lidos, col 10 = setores
/// escritos. Um setor = 512 bytes. O delta entre duas chamadas dividido pelo intervalo
/// dá a taxa em bytes/s.
pub fn read_disk_io() -> Vec<DiskIoCounters> {
    let Ok(content) = fs::read_to_string("/proc/diskstats") else {
        return Vec::new();
    };
    content
        .lines()
        .filter_map(|line| {
            let f: Vec<&str> = line.split_whitespace().collect();
            if f.len() < 10 {
                return None;
            }
            let name = f[2].to_string();
            // só devices físicos inteiros (nvme0n1, sda), não partições nem loop/ram
            let is_whole = (name.starts_with("nvme") && name.contains('n') && !name.contains('p'))
                || (name.starts_with("sd") && name.chars().last().map(|c| !c.is_ascii_digit()).unwrap_or(false));
            if !is_whole || name.starts_with("loop") || name.starts_with("ram") {
                return None;
            }
            let sectors_read: u64 = f[5].parse().ok()?;
            let sectors_written: u64 = f[9].parse().ok()?;
            Some(DiskIoCounters {
                device: name,
                read_bytes: sectors_read * 512,
                write_bytes: sectors_written * 512,
            })
        })
        .collect()
}

/// Nome base do disco físico a partir do device de partição (/dev/nvme0n1p2 -> nvme0n1).
pub fn disk_base_name(device: &str) -> String {
    let dev = device.trim_start_matches("/dev/");
    if dev.starts_with("nvme") {
        dev.split('p').next().unwrap_or(dev).to_string()
    } else {
        dev.trim_end_matches(|c: char| c.is_ascii_digit()).to_string()
    }
}


#[derive(Default, Clone)]
pub struct NetAdapter {
    pub name: String,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
}

/// Lê contadores acumulados de /proc/net/dev. O delta entre duas chamadas (dividido pelo
/// intervalo) dá a taxa — mesmo princípio do power.rs para RAPL.
pub fn read_net_counters() -> Vec<NetAdapter> {
    let Ok(content) = fs::read_to_string("/proc/net/dev") else {
        return Vec::new();
    };
    content
        .lines()
        .skip(2) // duas linhas de cabeçalho
        .filter_map(|line| {
            let (name, rest) = line.split_once(':')?;
            let name = name.trim().to_string();
            if name == "lo" {
                return None;
            }
            let fields: Vec<&str> = rest.split_whitespace().collect();
            let rx_bytes = fields.first()?.parse().ok()?;
            let tx_bytes = fields.get(8)?.parse().ok()?;
            Some(NetAdapter { name, rx_bytes, tx_bytes })
        })
        .collect()
}

#[derive(Clone)]
pub struct ProcInfo {
    pub pid: u32,
    pub name: String,
    pub rss_kb: u64,
    pub cpu_ticks: u64, // utime + stime acumulados, usado para delta de uso de CPU
}

fn read_proc_stat_fields(pid: u32) -> Option<(String, u64)> {
    let content = fs::read_to_string(format!("/proc/{pid}/stat")).ok()?;
    // O nome do processo vem entre parênteses e pode conter espaços/parênteses,
    // então localizamos pelo último ')' antes de seguir com os campos numéricos.
    let close_paren = content.rfind(')')?;
    let name = content[content.find('(')? + 1..close_paren].to_string();
    let rest: Vec<&str> = content[close_paren + 2..].split_whitespace().collect();
    // utime é campo 14, stime é campo 15 (1-indexed a partir do 3º campo já consumido,
    // ou seja índices 11 e 12 no vetor `rest` que começa no campo 3 do /proc/pid/stat).
    let utime: u64 = rest.get(11)?.parse().ok()?;
    let stime: u64 = rest.get(12)?.parse().ok()?;
    Some((name, utime + stime))
}

fn read_proc_rss_kb(pid: u32) -> Option<u64> {
    let content = fs::read_to_string(format!("/proc/{pid}/status")).ok()?;
    content
        .lines()
        .find(|l| l.starts_with("VmRSS:"))
        .and_then(|l| l.split_whitespace().nth(1))
        .and_then(|s| s.parse().ok())
}

/// Lista todos os processos do sistema com nome, RSS (memória residente) e ticks de CPU
/// acumulados. O chamador é responsável por calcular deltas de CPU entre duas leituras
/// (ver `top_processes_by_cpu`) já que ticks são contadores acumulados desde o boot do processo.
pub fn read_all_processes() -> Vec<ProcInfo> {
    let Ok(entries) = fs::read_dir("/proc") else {
        return Vec::new();
    };
    entries
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().to_str()?.parse::<u32>().ok())
        .filter_map(|pid| {
            let (name, cpu_ticks) = read_proc_stat_fields(pid)?;
            let rss_kb = read_proc_rss_kb(pid).unwrap_or(0);
            Some(ProcInfo { pid, name, rss_kb, cpu_ticks })
        })
        .collect()
}

pub fn top_processes_by_ram(n: usize) -> Vec<ProcInfo> {
    let mut procs = read_all_processes();
    procs.sort_by(|a, b| b.rss_kb.cmp(&a.rss_kb));
    procs.truncate(n);
    procs
}


pub fn read_hostname() -> String {
    fs::read_to_string("/proc/sys/kernel/hostname").map(|s| s.trim().to_string()).unwrap_or_default()
}

pub fn read_distro_name() -> String {
    fs::read_to_string("/etc/os-release")
        .ok()
        .and_then(|s| {
            s.lines()
                .find(|l| l.starts_with("PRETTY_NAME="))
                .map(|l| l["PRETTY_NAME=".len()..].trim_matches('"').to_string())
        })
        .unwrap_or_else(|| "Linux".to_string())
}

pub fn read_uptime_human() -> String {
    let Ok(content) = fs::read_to_string("/proc/uptime") else {
        return String::new();
    };
    let secs: f64 = content.split_whitespace().next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
    let h = (secs / 3600.0) as u64;
    let m = ((secs % 3600.0) / 60.0) as u64;
    format!("{h}h {m}m")
}

#[derive(Clone, Debug)]
pub struct SocketInfo {
    pub socket_id: usize,
    pub model: String,
    pub logical_ids: Vec<usize>,
    pub freq_mhz: u64,
}

pub fn read_cpu_topology() -> Vec<SocketInfo> {
    let Ok(content) = fs::read_to_string("/proc/cpuinfo") else {
        return vec![SocketInfo {
            socket_id: 0,
            model: read_cpu_model(),
            logical_ids: (0..cpu_core_count()).collect(),
            freq_mhz: read_cpu_freq_mhz(),
        }];
    };

    let mut sockets: std::collections::HashMap<usize, SocketInfo> = std::collections::HashMap::new();

    for block in content.split("\n\n") {
        let field = |key: &str| -> Option<String> {
            block.lines().find(|l| l.starts_with(key))
                .and_then(|l| l.split(':').nth(1))
                .map(|v| v.trim().to_string())
        };
        let Some(proc_id_str) = field("processor") else { continue };
        let Ok(proc_id) = proc_id_str.parse::<usize>() else { continue };
        let physical_id = field("physical id").and_then(|s| s.parse::<usize>().ok()).unwrap_or(0);
        let model = field("model name").unwrap_or_else(|| "CPU desconhecida".to_string());
        let freq_mhz = field("cpu MHz").and_then(|s| s.parse::<f64>().ok()).map(|f| f as u64).unwrap_or(0);

        let socket = sockets.entry(physical_id).or_insert_with(|| SocketInfo {
            socket_id: physical_id,
            model: model.clone(),
            logical_ids: Vec::new(),
            freq_mhz,
        });
        socket.logical_ids.push(proc_id);
        if socket.freq_mhz == 0 { socket.freq_mhz = freq_mhz; }
    }

    if sockets.is_empty() {
        return vec![SocketInfo {
            socket_id: 0,
            model: read_cpu_model(),
            logical_ids: (0..cpu_core_count()).collect(),
            freq_mhz: read_cpu_freq_mhz(),
        }];
    }

    let mut result: Vec<SocketInfo> = sockets.into_values().collect();
    result.sort_by_key(|s| s.socket_id);
    for s in &mut result {
        s.logical_ids.sort();
        if let Some(&first) = s.logical_ids.first() {
            let freq_path = format!("/sys/devices/system/cpu/cpu{first}/cpufreq/scaling_cur_freq");
            if let Ok(v) = fs::read_to_string(&freq_path) {
                if let Ok(khz) = v.trim().parse::<u64>() { s.freq_mhz = khz / 1000; }
            }
        }
    }
    result
}

pub fn read_cpu_cores_for_socket(socket_logical_ids: &[usize]) -> usize {
    fs::read_to_string("/proc/cpuinfo").ok()
        .and_then(|content| {
            content.split("\n\n")
                .find(|block| block.lines().any(|l| {
                    l.starts_with("processor") &&
                    l.split(':').nth(1).and_then(|v| v.trim().parse::<usize>().ok())
                     .map(|id| socket_logical_ids.contains(&id))
                     .unwrap_or(false)
                }))
                .and_then(|block| {
                    block.lines().find(|l| l.starts_with("cpu cores"))
                        .and_then(|l| l.split(':').nth(1))
                        .and_then(|v| v.trim().parse::<usize>().ok())
                })
        })
        .unwrap_or(socket_logical_ids.len().max(1))
}

// ---------------------------------------------------------------------------
// Informações extras de sistema (kernel, placa-mãe, BIOS, data de instalação)
// ---------------------------------------------------------------------------

/// Versão do kernel (uname -r), lida de /proc/sys/kernel/osrelease.
pub fn read_kernel_version() -> String {
    fs::read_to_string("/proc/sys/kernel/osrelease")
        .map(|s| s.trim().to_string())
        .unwrap_or_default()
}

/// Nome do produto da placa-mãe (ex: "MACHINIST X99"). Lê de DMI via sysfs,
/// que não exige root (diferente do dmidecode).
/// Nome do produto do sistema montado (ex: "MACHINIST E5-D8-MAX") + versão,
/// como aparece no cabeçalho da v2.0. Lido do DMI product_name/product_version.
pub fn read_product_name() -> String {
    let name = fs::read_to_string("/sys/devices/virtual/dmi/id/product_name")
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    let version = fs::read_to_string("/sys/devices/virtual/dmi/id/product_version")
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    let is_generic = |s: &str| {
        let l = s.to_lowercase();
        s.is_empty() || l.contains("to be filled") || l == "default string" || l == "system product name" || l == "none"
    };
    let name = if is_generic(&name) { String::new() } else { name };
    let version = if is_generic(&version) { String::new() } else { version };
    match (name.is_empty(), version.is_empty()) {
        (false, false) => format!("{name} ({version})"),
        (false, true) => name,
        _ => read_motherboard(),
    }
}

pub fn read_motherboard() -> String {
    let vendor = fs::read_to_string("/sys/devices/virtual/dmi/id/board_vendor")
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    let name = fs::read_to_string("/sys/devices/virtual/dmi/id/board_name")
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    match (vendor.is_empty(), name.is_empty()) {
        (false, false) => format!("{vendor} {name}"),
        (true, false) => name,
        (false, true) => vendor,
        _ => "Desconhecida".to_string(),
    }
}

/// Fabricante e data do BIOS/UEFI (ex: "American Megatrends Inc. 12/20/2022").
pub fn read_bios() -> String {
    let vendor = fs::read_to_string("/sys/devices/virtual/dmi/id/bios_vendor")
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    let date = fs::read_to_string("/sys/devices/virtual/dmi/id/bios_date")
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    format!("{vendor} {date}").trim().to_string()
}

/// Data aproximada de instalação do sistema, inferida da data de criação do
/// filesystem raiz (nascimento do diretório /lost+found ou do próprio /).
/// Usa `stat` pra ler o birth time; retorna algo como "2026-05-30".
pub fn read_install_date() -> String {
    // Tenta o birth time (%W) de / via stat; nem todo fs suporta, então cai
    // pra data de modificação do /etc como aproximação razoável.
    let try_stat = |path: &str, fmt: &str| -> Option<String> {
        std::process::Command::new("stat")
            .args(["-c", fmt, path])
            .output()
            .ok()
            .filter(|o| o.status.success())
            .and_then(|o| {
                let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
                if s.is_empty() || s == "0" || s == "-" { None } else { Some(s) }
            })
    };
    // %w = data de nascimento humana (YYYY-MM-DD ...). Pega só a parte da data.
    if let Some(birth) = try_stat("/", "%w") {
        if let Some(date) = birth.split_whitespace().next() {
            if date.contains('-') {
                return date.to_string();
            }
        }
    }
    // Fallback: data de modificação de /etc/hostname (criado na instalação)
    try_stat("/etc/hostname", "%y")
        .and_then(|s| s.split_whitespace().next().map(|d| d.to_string()))
        .unwrap_or_else(|| "—".to_string())
}
