// Port de get_available_profiles / get_current_profile / _apply_profile_sync
// (backend/machctrl_server.py linhas 1236-1314, 1422-1441)

use serde::Serialize;
use std::fs;
use std::path::Path;

const CPU0_CPUFREQ: &str = "/sys/devices/system/cpu/cpu0/cpufreq";
const PSTATE_BASE: &str = "/sys/devices/system/cpu/intel_pstate";

#[derive(Serialize)]
pub struct ProfilesInfo {
    pub available_profiles: Vec<String>,
    pub current_profile: String,
    pub available_governors: Vec<String>,
    pub has_pstate: bool,
}

fn read_available_governors() -> Vec<String> {
    let path = format!("{CPU0_CPUFREQ}/scaling_available_governors");
    fs::read_to_string(path)
        .map(|s| s.trim().split_whitespace().map(String::from).collect())
        .unwrap_or_default()
}

fn read_current_governor() -> String {
    fs::read_to_string(format!("{CPU0_CPUFREQ}/scaling_governor"))
        .map(|s| s.trim().to_string())
        .unwrap_or_default()
}

fn has_pstate() -> bool {
    Path::new(PSTATE_BASE).exists()
}

pub fn get_available_profiles() -> (Vec<String>, Vec<String>, bool) {
    let available_governors = read_available_governors();
    let pstate = has_pstate();

    let mut profiles = Vec::new();
    if pstate {
        profiles = vec!["silent".into(), "balanced".into(), "performance".into()];
    } else {
        if available_governors.iter().any(|g| g == "powersave") {
            profiles.push("silent".into());
        }
        if available_governors.iter().any(|g| ["schedutil", "ondemand", "conservative"].contains(&g.as_str())) {
            profiles.push("balanced".into());
        }
        if available_governors.iter().any(|g| g == "performance") {
            profiles.push("performance".into());
        }
    }
    if profiles.is_empty() {
        profiles.push("balanced".into());
    }
    (profiles, available_governors, pstate)
}

pub fn get_current_profile(available_governors: &[String], pstate: bool) -> String {
    let governor = read_current_governor();

    if pstate {
        let max_perf: i32 = fs::read_to_string(format!("{PSTATE_BASE}/max_perf_pct"))
            .ok()
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(100);

        return match governor.as_str() {
            "powersave" if max_perf <= 50 => "silent".to_string(),
            "powersave" => "balanced".to_string(),
            "performance" => "performance".to_string(),
            _ => "balanced".to_string(),
        };
    }

    let _ = available_governors; // mantido pra paridade de assinatura com o Python
    match governor.as_str() {
        "powersave" | "conservative" => "silent".to_string(),
        "schedutil" | "ondemand" => "balanced".to_string(),
        "performance" => "performance".to_string(),
        _ => "balanced".to_string(),
    }
}

pub fn get_profiles_info() -> ProfilesInfo {
    let (available_profiles, available_governors, pstate) = get_available_profiles();
    let current_profile = get_current_profile(&available_governors, pstate);
    ProfilesInfo { available_profiles, current_profile, available_governors, has_pstate: pstate }
}

/// Equivalente a _apply_profile_sync(): escreve o governador em scaling_governor de cada CPU.
/// Requer root (escrita em /sys) — igual à limitação do backend Python.
pub fn apply_profile(profile_name: &str, available_governors: &[String], cpu_count: usize) -> Result<(), String> {
    let governor = match profile_name {
        "silent" => "powersave",
        "balanced" => ["schedutil", "ondemand", "powersave"]
            .iter()
            .find(|g| available_governors.iter().any(|ag| ag == *g))
            .copied()
            .unwrap_or("powersave"),
        "performance" => "performance",
        _ => "schedutil",
    };

    let mut any_ok = false;
    let mut last_err = String::new();
    for i in 0..cpu_count {
        let gov_path = format!("/sys/devices/system/cpu/cpu{i}/cpufreq/scaling_governor");
        if Path::new(&gov_path).exists() {
            match fs::write(&gov_path, governor) {
                Ok(_) => any_ok = true,
                Err(e) => last_err = format!("sem permissão em {gov_path}: {e} (execute como root)"),
            }
        }
    }
    if any_ok {
        Ok(())
    } else {
        Err(if last_err.is_empty() { "nenhuma CPU com cpufreq encontrada".to_string() } else { last_err })
    }
}
