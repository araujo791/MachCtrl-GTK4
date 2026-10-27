// Ajustes de sistema (tela Ajuste). Cada leitura/escrita é feita direto em
// sysfs/proc ou via systemctl. Tudo detectável: o frontend só mostra o que o
// sistema realmente suporta.

use std::fs;
use std::process::Command;

// ---------------------------------------------------------------------------
// Leitura de valores atuais
// ---------------------------------------------------------------------------

fn read_trim(path: &str) -> Option<String> {
    fs::read_to_string(path).ok().map(|s| s.trim().to_string())
}

/// Lê o swappiness atual (/proc/sys/vm/swappiness).
pub fn get_swappiness() -> Option<i32> {
    read_trim("/proc/sys/vm/swappiness").and_then(|s| s.parse().ok())
}

/// Lê o vm.dirty_ratio (% de RAM suja antes de forçar escrita).
pub fn get_dirty_ratio() -> Option<i32> {
    read_trim("/proc/sys/vm/dirty_ratio").and_then(|s| s.parse().ok())
}

/// Lê o vm.dirty_background_ratio (% que dispara escrita em background).
pub fn get_dirty_bg_ratio() -> Option<i32> {
    read_trim("/proc/sys/vm/dirty_background_ratio").and_then(|s| s.parse().ok())
}

/// Lê o vfs_cache_pressure atual.
pub fn get_cache_pressure() -> Option<i32> {
    read_trim("/proc/sys/vm/vfs_cache_pressure").and_then(|s| s.parse().ok())
}

/// Lê o modo de THP: retorna a opção entre colchetes ([always], madvise, never).
pub fn get_thp() -> Option<String> {
    let raw = read_trim("/sys/kernel/mm/transparent_hugepage/enabled")?;
    // formato: "always [madvise] never" — extrai o que está entre colchetes
    raw.split_whitespace()
        .find(|w| w.starts_with('[') && w.ends_with(']'))
        .map(|w| w.trim_matches(|c| c == '[' || c == ']').to_string())
        .or(Some(raw))
}

#[derive(serde::Serialize)]
pub struct DiskScheduler {
    pub device: String,
    pub current: String,
    pub available: Vec<String>,
    pub disk_type: String,
}

/// Detecta se um disco é removível/externo (USB, etc.) pra ignorá-lo.
/// Lê /sys/block/<dev>/removable e o barramento em /sys/block/<dev>/.../subsystem.
fn is_internal_disk(name: &str) -> bool {
    // removable == "1" → cartão/pendrive
    if let Some(rem) = read_trim(&format!("/sys/block/{name}/removable")) {
        if rem == "1" {
            return false;
        }
    }
    // resolve o link do device pra ver se está atrás de USB
    let dev_link = format!("/sys/block/{name}");
    if let Ok(target) = fs::read_link(&dev_link) {
        let path = target.to_string_lossy().to_lowercase();
        if path.contains("usb") {
            return false;
        }
    }
    // também checa o caminho real completo
    if let Ok(real) = fs::canonicalize(&dev_link) {
        let p = real.to_string_lossy().to_lowercase();
        if p.contains("/usb") {
            return false;
        }
    }
    true
}

/// Lê o I/O scheduler de cada disco INTERNO (sd*, nvme*; ignora USB/removível).
pub fn get_io_schedulers() -> Vec<DiskScheduler> {
    let mut out = Vec::new();
    if let Ok(entries) = fs::read_dir("/sys/block") {
        let mut names: Vec<String> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .filter(|n| n.starts_with("sd") || n.starts_with("nvme"))
            .filter(|n| is_internal_disk(n))
            .collect();
        names.sort();
        for name in names {
            let path = format!("/sys/block/{name}/queue/scheduler");
            if let Some(raw) = read_trim(&path) {
                let available: Vec<String> = raw
                    .split_whitespace()
                    .map(|w| w.trim_matches(|c| c == '[' || c == ']').to_string())
                    .collect();
                let current = raw
                    .split_whitespace()
                    .find(|w| w.starts_with('['))
                    .map(|w| w.trim_matches(|c| c == '[' || c == ']').to_string())
                    .unwrap_or_default();
                // tipo do disco (nvme, ssd, hdd) pra sugerir o scheduler ideal
                let disk_type = detect_disk_type(&name);
                out.push(DiskScheduler { device: name, current, available, disk_type });
            }
        }
    }
    out
}

/// Detecta o tipo do disco: nvme, ssd (rotational=0) ou hdd (rotational=1).
fn detect_disk_type(name: &str) -> String {
    if name.starts_with("nvme") {
        return "nvme".into();
    }
    match read_trim(&format!("/sys/block/{name}/queue/rotational")).as_deref() {
        Some("0") => "ssd".into(),
        _ => "hdd".into(),
    }
}

/// Verifica se um comando existe no PATH.
pub fn command_exists(cmd: &str) -> bool {
    Command::new("sh")
        .args(["-c", &format!("command -v {cmd}")])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[derive(serde::Serialize)]
pub struct ServiceState {
    pub name: String,
    pub active: bool,
    pub enabled: bool,
    pub exists: bool,
}

/// Estado de um serviço systemd (active/enabled/existe).
pub fn get_service(name: &str) -> ServiceState {
    let active = Command::new("systemctl")
        .args(["is-active", "--quiet", name])
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    let enabled_out = Command::new("systemctl")
        .args(["is-enabled", name])
        .output()
        .ok();
    let enabled_str = enabled_out
        .as_ref()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default();
    // "not-found" significa que a unit não existe
    let exists = enabled_str != "not-found" && !enabled_str.is_empty();
    let enabled = enabled_str == "enabled" || enabled_str == "enabled-runtime";
    ServiceState { name: name.to_string(), active, enabled, exists }
}

// --- Rede: TCP congestion control (BBR e afins) ---

#[derive(serde::Serialize)]
pub struct NetworkState {
    pub current_cc: Option<String>,
    pub available_cc: Vec<String>,
    pub bbr_available: bool,
}

/// Lê o congestion control atual e os disponíveis.
pub fn get_network_state() -> NetworkState {
    let current = read_trim("/proc/sys/net/ipv4/tcp_congestion_control");
    let available: Vec<String> = read_trim("/proc/sys/net/ipv4/tcp_available_congestion_control")
        .map(|s| s.split_whitespace().map(|w| w.to_string()).collect())
        .unwrap_or_default();
    // BBR pode não estar carregado mas ser carregável via modprobe
    let bbr_available = available.iter().any(|c| c == "bbr")
        || std::path::Path::new("/lib/modules").exists();
    NetworkState { current_cc: current, available_cc: available, bbr_available }
}

/// Aplica o congestion control e persiste. Se for bbr e não estiver disponível,
/// tenta carregar o módulo primeiro.
pub fn set_congestion_control(algo: &str) -> Result<(), String> {
    // sanitiza (só letras/números)
    if !algo.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err("algoritmo inválido".into());
    }
    // tenta carregar o módulo se for bbr
    if algo == "bbr" {
        let _ = Command::new("modprobe").arg("tcp_bbr").status();
    }
    fs::write("/proc/sys/net/ipv4/tcp_congestion_control", algo)
        .map_err(|e| format!("erro ao aplicar congestion control: {e}"))?;
    // persiste no sysctl + garante o módulo no boot
    persist_sysctl("net.ipv4.tcp_congestion_control", algo)?;
    if algo == "bbr" {
        let _ = fs::write("/etc/modules-load.d/machctrl-bbr.conf", "tcp_bbr\n");
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Aplicação (requer root — o app roda elevado)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Persistência: além de aplicar em runtime, grava a config permanente pra
// sobreviver ao reboot (sysctl.d, udev, tmpfiles).
// ---------------------------------------------------------------------------

const SYSCTL_FILE: &str = "/etc/sysctl.d/99-machctrl.conf";
const UDEV_FILE: &str = "/etc/udev/rules.d/60-machctrl-ioscheduler.rules";
const THP_TMPFILES: &str = "/etc/tmpfiles.d/machctrl-thp.conf";

/// Lê/atualiza uma chave no arquivo sysctl do MachCtrl (formato "chave = valor").
fn persist_sysctl(key: &str, value: &str) -> Result<(), String> {
    let mut lines: Vec<String> = fs::read_to_string(SYSCTL_FILE)
        .unwrap_or_default()
        .lines()
        .filter(|l| {
            let l = l.trim();
            // remove a linha existente dessa mesma chave e comentários vazios
            !l.starts_with(key) && !l.is_empty()
        })
        .map(|l| l.to_string())
        .collect();
    lines.insert(0, "# Gerado pelo MachCtrl — ajustes persistentes".to_string());
    lines.push(format!("{key} = {value}"));
    fs::write(SYSCTL_FILE, lines.join("\n") + "\n")
        .map_err(|e| format!("erro ao persistir sysctl: {e}"))
}

pub fn set_swappiness(value: i32) -> Result<(), String> {
    let v = value.clamp(0, 200);
    fs::write("/proc/sys/vm/swappiness", v.to_string())
        .map_err(|e| format!("erro ao aplicar swappiness: {e}"))?;
    persist_sysctl("vm.swappiness", &v.to_string())
}

pub fn set_cache_pressure(value: i32) -> Result<(), String> {
    let v = value.clamp(0, 1000);
    fs::write("/proc/sys/vm/vfs_cache_pressure", v.to_string())
        .map_err(|e| format!("erro ao aplicar cache_pressure: {e}"))?;
    persist_sysctl("vm.vfs_cache_pressure", &v.to_string())
}

pub fn set_dirty_ratio(value: i32) -> Result<(), String> {
    let v = value.clamp(1, 100);
    fs::write("/proc/sys/vm/dirty_ratio", v.to_string())
        .map_err(|e| format!("erro ao aplicar dirty_ratio: {e}"))?;
    persist_sysctl("vm.dirty_ratio", &v.to_string())
}

pub fn set_dirty_bg_ratio(value: i32) -> Result<(), String> {
    let v = value.clamp(1, 100);
    fs::write("/proc/sys/vm/dirty_background_ratio", v.to_string())
        .map_err(|e| format!("erro ao aplicar dirty_background_ratio: {e}"))?;
    persist_sysctl("vm.dirty_background_ratio", &v.to_string())
}

pub fn set_thp(mode: &str) -> Result<(), String> {
    if !["always", "madvise", "never"].contains(&mode) {
        return Err("modo THP inválido".into());
    }
    fs::write("/sys/kernel/mm/transparent_hugepage/enabled", mode)
        .map_err(|e| format!("erro ao aplicar THP: {e}"))?;
    // Persiste via tmpfiles.d (escreve no sysfs em todo boot).
    let content = format!(
        "# Gerado pelo MachCtrl\nw! /sys/kernel/mm/transparent_hugepage/enabled - - - - {mode}\n"
    );
    fs::write(THP_TMPFILES, content).map_err(|e| format!("erro ao persistir THP: {e}"))
}

pub fn set_io_scheduler(device: &str, scheduler: &str) -> Result<(), String> {
    if device.contains('/') || device.contains("..") {
        return Err("device inválido".into());
    }
    let path = format!("/sys/block/{device}/queue/scheduler");
    fs::write(&path, scheduler).map_err(|e| format!("erro ao aplicar scheduler: {e}"))?;

    // Persiste via regra udev por device. Reescreve o arquivo inteiro mantendo
    // as regras dos outros devices e atualizando/inserindo a deste.
    let existing = fs::read_to_string(UDEV_FILE).unwrap_or_default();
    let mut lines: Vec<String> = existing
        .lines()
        .filter(|l| {
            let l = l.trim();
            !l.is_empty() && !l.starts_with('#') && !l.contains(&format!("KERNEL==\"{device}\""))
        })
        .map(|l| l.to_string())
        .collect();
    lines.insert(0, "# Gerado pelo MachCtrl — I/O schedulers persistentes".to_string());
    lines.push(format!(
        "ACTION==\"add|change\", KERNEL==\"{device}\", ATTR{{queue/scheduler}}=\"{scheduler}\""
    ));
    fs::write(UDEV_FILE, lines.join("\n") + "\n")
        .map_err(|e| format!("erro ao persistir udev: {e}"))
}

/// Liga/desliga (active) e habilita/desabilita (boot) um serviço.
pub fn set_service(name: &str, enable: bool) -> Result<(), String> {
    let (action_now, action_boot) = if enable {
        ("start", "enable")
    } else {
        ("stop", "disable")
    };
    // habilita/desabilita no boot
    let _ = Command::new("systemctl").args([action_boot, name]).status();
    // liga/desliga agora
    Command::new("systemctl")
        .args([action_now, name])
        .status()
        .map_err(|e| format!("erro ao {action_now} {name}: {e}"))?;
    Ok(())
}
