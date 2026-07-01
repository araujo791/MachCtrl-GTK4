// Port de get_cpu_power / read_rapl_power / _estimate_power_watts
// (backend/machctrl_server.py linhas 218-262, 1975+)

use std::fs;
use std::path::PathBuf;
use std::time::Instant;

const RAPL_BASE: &str = "/sys/class/powercap";

/// Encontra TODOS os domínios RAPL "package" (intel-rapl:0, intel-rapl:1, ...).
/// Máquinas multi-socket têm um domínio por socket — precisamos somar todos,
/// senão só medimos o consumo de uma CPU. Retorna (energy_uj_path, max_range_uj).
pub fn find_all_rapl_packages() -> Vec<(PathBuf, Option<u64>)> {
    let mut out = Vec::new();
    let Ok(entries) = fs::read_dir(RAPL_BASE) else { return out };
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        // só domínios de topo intel-rapl:N (não os subdomínios intel-rapl:N:M)
        let fname = path.file_name().and_then(|f| f.to_str()).unwrap_or("");
        if !fname.starts_with("intel-rapl:") || fname.matches(':').count() != 1 {
            continue;
        }
        if let Ok(name) = fs::read_to_string(path.join("name")) {
            if name.trim().starts_with("package") {
                let energy_file = path.join("energy_uj");
                if energy_file.exists() {
                    let max = fs::read_to_string(path.join("max_energy_range_uj"))
                        .ok()
                        .and_then(|s| s.trim().parse::<u64>().ok());
                    out.push((energy_file, max));
                }
            }
        }
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

/// Estado persistente entre leituras pra calcular potência média (delta energia / delta tempo).
/// Agora acompanha TODOS os domínios package (um por socket) e soma o consumo.
pub struct RaplReader {
    packages: Vec<(PathBuf, Option<u64>)>, // (energy_uj, max_range_uj) por socket
    prev_energy_uj: Vec<Option<u64>>,      // leitura anterior de cada domínio
    prev_time: Instant,
}

impl RaplReader {
    pub fn new() -> Self {
        let packages = find_all_rapl_packages();
        let n = packages.len();
        Self {
            packages,
            prev_energy_uj: vec![None; n],
            prev_time: Instant::now(),
        }
    }

    pub fn available(&self) -> bool {
        !self.packages.is_empty()
    }

    /// Retorna a SOMA dos watts de todos os sockets desde a última chamada, ou None
    /// na primeira leitura / se RAPL indisponível.
    pub fn read_watts(&mut self) -> Option<f64> {
        if self.packages.is_empty() {
            return None;
        }
        let now = Instant::now();
        let dt = now.duration_since(self.prev_time).as_secs_f64();
        if dt <= 0.0 {
            return None;
        }

        let mut total_watts = 0.0;
        let mut had_prev = false;
        for (i, (path, max)) in self.packages.iter().enumerate() {
            let Ok(current) = fs::read_to_string(path).and_then(|s| {
                s.trim().parse::<u64>().map_err(|_| std::io::Error::new(std::io::ErrorKind::InvalidData, "parse"))
            }) else {
                continue;
            };
            if let Some(prev) = self.prev_energy_uj[i] {
                had_prev = true;
                let delta_uj = if current >= prev {
                    current - prev
                } else {
                    // wraparound do contador
                    let m = max.unwrap_or(u32::MAX as u64);
                    (m - prev) + current
                };
                total_watts += (delta_uj as f64 / 1_000_000.0) / dt;
            }
            self.prev_energy_uj[i] = Some(current);
        }

        self.prev_time = now;
        if had_prev {
            Some(total_watts)
        } else {
            None
        }
    }
}

/// Diagnóstico: lista TODOS os domínios e subdomínios RAPL com nome e energia atual.
/// Usado pra investigar por que o consumo pode estar sendo subestimado.
pub fn debug_rapl_domains() -> String {
    let mut out = String::new();
    let Ok(entries) = fs::read_dir(RAPL_BASE) else {
        return "powercap indisponível".into();
    };
    let mut paths: Vec<PathBuf> = entries.filter_map(|e| e.ok()).map(|e| e.path()).collect();
    paths.sort();
    for path in paths {
        let fname = path.file_name().and_then(|f| f.to_str()).unwrap_or("").to_string();
        let name = fs::read_to_string(path.join("name")).unwrap_or_default().trim().to_string();
        let energy = fs::read_to_string(path.join("energy_uj")).unwrap_or_default().trim().to_string();
        let max = fs::read_to_string(path.join("max_energy_range_uj")).unwrap_or_default().trim().to_string();
        if !name.is_empty() {
            out.push_str(&format!("{fname} | name={name} | energy_uj={energy} | max={max}\n"));
        }
        // subdomínios
        if let Ok(subs) = fs::read_dir(&path) {
            let mut subpaths: Vec<PathBuf> = subs.filter_map(|e| e.ok()).map(|e| e.path()).collect();
            subpaths.sort();
            for sp in subpaths {
                let sfname = sp.file_name().and_then(|f| f.to_str()).unwrap_or("").to_string();
                if sfname.starts_with("intel-rapl") {
                    let sname = fs::read_to_string(sp.join("name")).unwrap_or_default().trim().to_string();
                    let senergy = fs::read_to_string(sp.join("energy_uj")).unwrap_or_default().trim().to_string();
                    if !sname.is_empty() {
                        out.push_str(&format!("  {sfname} | name={sname} | energy_uj={senergy}\n"));
                    }
                }
            }
        }
    }
    if out.is_empty() { "nenhum domínio RAPL encontrado".into() } else { out }
}

/// igual ao _estimate_power_watts() do Python (uso% * TDP estimado / 100, com piso de idle).
pub fn estimate_power_watts(cpu_usage_pct: f32, tdp_watts: f64) -> f64 {
    let idle_floor = tdp_watts * 0.1;
    idle_floor + (tdp_watts - idle_floor) * (cpu_usage_pct as f64 / 100.0)
}
