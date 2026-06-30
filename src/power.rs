// Port de get_cpu_power / read_rapl_power / _estimate_power_watts
// (backend/machctrl_server.py linhas 218-262, 1975+)

use std::fs;
use std::path::PathBuf;
use std::time::Instant;

const RAPL_BASE: &str = "/sys/class/powercap";

/// Encontra o primeiro domínio RAPL "package" (intel-rapl:0, etc.) e retorna o
/// caminho do arquivo energy_uj, igual ao Python faz via glob em intel-rapl*.
pub fn find_rapl_energy_path() -> Option<PathBuf> {
    let entries = fs::read_dir(RAPL_BASE).ok()?;
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        let name_file = path.join("name");
        if let Ok(name) = fs::read_to_string(&name_file) {
            if name.trim().starts_with("package") {
                let energy_file = path.join("energy_uj");
                if energy_file.exists() {
                    return Some(energy_file);
                }
            }
        }
    }
    None
}

/// Estado persistente entre leituras pra calcular potência média (delta energia / delta tempo),
/// igual ao Python guarda prev_energy/prev_time entre chamadas. Sem isso a leitura instantânea
/// de energy_uj não tem sentido (é um contador acumulado, não potência instantânea).
pub struct RaplReader {
    energy_path: Option<PathBuf>,
    prev_energy_uj: Option<u64>,
    prev_time: Instant,
    // energy_uj é um contador de 32/64-bit que faz wraparound; max_energy_range_uj
    // informa o valor máximo antes de zerar (igual ao tratamento de overflow do Python).
    max_energy_uj: Option<u64>,
}

impl RaplReader {
    pub fn new() -> Self {
        let energy_path = find_rapl_energy_path();
        let max_energy_uj = energy_path.as_ref().and_then(|p| {
            let max_path = p.parent()?.join("max_energy_range_uj");
            fs::read_to_string(max_path).ok()?.trim().parse::<u64>().ok()
        });
        Self {
            energy_path,
            prev_energy_uj: None,
            prev_time: Instant::now(),
            max_energy_uj,
        }
    }

    pub fn available(&self) -> bool {
        self.energy_path.is_some()
    }

    /// Retorna watts médios desde a última chamada, ou None se não houver leitura anterior
    /// (primeira chamada) ou RAPL indisponível (sistemas sem Intel RAPL, ex: AMD/ARM).
    pub fn read_watts(&mut self) -> Option<f64> {
        let path = self.energy_path.as_ref()?;
        let current_energy: u64 = fs::read_to_string(path).ok()?.trim().parse().ok()?;
        let now = Instant::now();

        let watts = match self.prev_energy_uj {
            Some(prev) => {
                let dt = now.duration_since(self.prev_time).as_secs_f64();
                if dt <= 0.0 {
                    None
                } else {
                    let delta_uj = if current_energy >= prev {
                        current_energy - prev
                    } else {
                        // wraparound do contador
                        let max = self.max_energy_uj.unwrap_or(u32::MAX as u64);
                        (max - prev) + current_energy
                    };
                    Some((delta_uj as f64 / 1_000_000.0) / dt)
                }
            }
            None => None,
        };

        self.prev_energy_uj = Some(current_energy);
        self.prev_time = now;
        watts
    }
}

/// Fallback quando RAPL não está disponível: estimativa grosseira baseada em uso de CPU,
/// igual ao _estimate_power_watts() do Python (uso% * TDP estimado / 100, com piso de idle).
pub fn estimate_power_watts(cpu_usage_pct: f32, tdp_watts: f64) -> f64 {
    let idle_floor = tdp_watts * 0.1;
    idle_floor + (tdp_watts - idle_floor) * (cpu_usage_pct as f64 / 100.0)
}
