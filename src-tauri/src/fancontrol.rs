// Controle de fans por software — portado da abordagem da v2.0 (Python).
//
// DESCOBERTA-CHAVE da v2.0: o SmartFan do chip nct6779 (modo 5) usa o sensor
// de temperatura ERRADO (aponta pra placa-mãe, não pra CPU). Por isso o controle
// "automático" do firmware não regula direito. A solução é IGNORAR o SmartFan e
// controlar tudo por software: um loop lê a temperatura real da CPU/GPU e escreve
// o PWM (em modo manual, enable=1) a cada ciclo, seguindo uma curva.
//
// Isso também é o que faz a "curva" da GPU funcionar: em vez de deixar o driver
// decidir, aplicamos a curva definida pelo usuário.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use crate::hwmon;
use crate::procstat;

/// Caminho do arquivo de configuração persistente (compartilhado entre o app e o
/// daemon). Fica em /etc pra o serviço systemd (root) conseguir ler no boot.
pub const CONFIG_PATH: &str = "/etc/machctrl/fans.json";

/// Modo de cada fan, escolhido pelo usuário no frontend.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum FanMode {
    Auto,   // controlado por software com curva padrão (CPU) ou pelo driver (GPU)
    Manual, // velocidade fixa definida pelo usuário
    Max,    // 100%
    Curve,  // segue a curva personalizada do usuário (GPU)
}

/// Um ponto da curva: temperatura (°C) → velocidade (%).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CurvePoint {
    pub temp: f64,
    pub pct: f64,
}

/// Estado de um fan sob controle.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FanControl {
    pub pwm_path: String,
    pub pwm_enable_path: Option<String>,
    pub chip: String,
    pub mode: FanMode,
    pub manual_pct: i32,        // usado no modo Manual
    pub curve: Vec<CurvePoint>, // usado no modo Curve
    pub is_gpu: bool,
}

/// Estado global do controlador, compartilhado entre a thread e os comandos.
#[derive(Default, Serialize, Deserialize)]
pub struct FanController {
    pub fans: HashMap<String, FanControl>, // fan_id -> controle
}

pub type SharedFanController = Arc<Mutex<FanController>>;

/// Salva as configurações de fan no arquivo persistente (/etc/machctrl/fans.json).
pub fn save_config(ctrl: &FanController) {
    if let Some(dir) = std::path::Path::new(CONFIG_PATH).parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(json) = serde_json::to_string_pretty(ctrl) {
        let _ = std::fs::write(CONFIG_PATH, json);
    }
}

/// Carrega as configurações salvas, se existirem. Retorna um controlador vazio
/// se o arquivo não existir ou estiver corrompido.
pub fn load_config() -> FanController {
    std::fs::read_to_string(CONFIG_PATH)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Curva padrão da GPU (auto por software, suave, sem os picos do driver):
/// <40°C→30%, 50°C→40%, 65°C→60%, 75°C→80%, 85°C+→100%.
fn gpu_default_pct(temp: f64) -> i32 {
    let pct = if temp < 40.0 {
        30.0
    } else if temp < 50.0 {
        30.0 + (temp - 40.0) * 1.0 // 30→40
    } else if temp < 65.0 {
        40.0 + (temp - 50.0) * 1.33 // 40→60
    } else if temp < 75.0 {
        60.0 + (temp - 65.0) * 2.0 // 60→80
    } else if temp < 85.0 {
        80.0 + (temp - 75.0) * 2.0 // 80→100
    } else {
        100.0
    };
    pct.round() as i32
}

/// Curva padrão da CPU (do comentário da v2.0):
/// 30°C→45%, 50°C→60%, 65°C→80%, 75°C→90%, 85°C→100%.
fn cpu_default_pct(temp: f64) -> i32 {
    let pct = if temp < 30.0 {
        45.0
    } else if temp < 50.0 {
        45.0 + (temp - 30.0) * 0.75 // 45→60
    } else if temp < 65.0 {
        60.0 + (temp - 50.0) * 1.33 // 60→80
    } else if temp < 75.0 {
        80.0 + (temp - 65.0) * 1.0 // 80→90
    } else if temp < 85.0 {
        90.0 + (temp - 75.0) * 1.0 // 90→100
    } else {
        100.0
    };
    pct.round() as i32
}

/// Interpola a velocidade (%) numa curva de pontos para uma dada temperatura.
fn interpolate_curve(curve: &[CurvePoint], temp: f64) -> f64 {
    if curve.is_empty() {
        return 0.0;
    }
    let mut sorted = curve.to_vec();
    sorted.sort_by(|a, b| a.temp.partial_cmp(&b.temp).unwrap_or(std::cmp::Ordering::Equal));

    if temp <= sorted[0].temp {
        return sorted[0].pct;
    }
    if temp >= sorted[sorted.len() - 1].temp {
        return sorted[sorted.len() - 1].pct;
    }
    for i in 0..sorted.len() - 1 {
        let (t0, p0) = (sorted[i].temp, sorted[i].pct);
        let (t1, p1) = (sorted[i + 1].temp, sorted[i + 1].pct);
        if t0 <= temp && temp <= t1 {
            let ratio = if t1 != t0 { (temp - t0) / (t1 - t0) } else { 0.0 };
            return p0 + ratio * (p1 - p0);
        }
    }
    sorted[sorted.len() - 1].pct
}

fn pct_to_pwm(pct: i32) -> i32 {
    ((pct.clamp(0, 100) as f64) * 2.55).round() as i32
}

/// Aplica um valor de PWM forçando enable=1 antes (o chip pode reverter entre ciclos).
fn write_pwm(pwm_path: &str, enable_path: &Option<String>, pwm_val: i32) {
    if let Some(ep) = enable_path {
        let _ = std::fs::write(ep, "1");
    }
    let _ = std::fs::write(pwm_path, pwm_val.clamp(0, 255).to_string());
}

/// Lê a maior temperatura de package entre os sockets de CPU.
fn cpu_package_temp() -> f64 {
    let (temps, _) = hwmon::read_all_temps_and_fans();
    let mut pkg = 0.0f64;
    for tsensor in &temps {
        let l = tsensor.label.to_lowercase();
        if l.contains("package") || l.contains("tctl") || l.contains("tdie") {
            pkg = pkg.max(tsensor.value_c);
        }
    }
    // fallback: maior de qualquer sensor de coretemp
    if pkg == 0.0 {
        for tsensor in &temps {
            if tsensor.chip.to_lowercase().contains("coretemp") {
                pkg = pkg.max(tsensor.value_c);
            }
        }
    }
    pkg
}

/// Lê a temperatura da GPU (amdgpu).
fn gpu_temp() -> f64 {
    crate::gpu::read_all_gpus()
        .first()
        .and_then(|g| g.temp_c)
        .unwrap_or(0.0)
}

/// Inicia a thread de controle de fans por software. Roda a cada 3 segundos,
/// aplicando o modo de cada fan: Auto/Curve são controlados por software;
/// Manual/Max são aplicados uma vez (aqui reforçamos pra não reverterem).
pub fn spawn_control_thread(controller: SharedFanController) {
    thread::spawn(move || {
        loop {
            let cpu_t = cpu_package_temp();
            let gpu_t = gpu_temp();

            // clona os controles pra não segurar o lock durante o I/O
            let fans: Vec<FanControl> = {
                let guard = controller.lock().unwrap();
                guard.fans.values().cloned().collect()
            };

            for fan in fans {
                match fan.mode {
                    FanMode::Manual => {
                        // reforça o valor manual (o chip pode reverter)
                        write_pwm(&fan.pwm_path, &fan.pwm_enable_path, pct_to_pwm(fan.manual_pct));
                    }
                    FanMode::Max => {
                        write_pwm(&fan.pwm_path, &fan.pwm_enable_path, 255);
                    }
                    FanMode::Curve => {
                        // curva personalizada — usada pela GPU
                        let temp = if fan.is_gpu { gpu_t } else { cpu_t };
                        if temp > 0.0 && !fan.curve.is_empty() {
                            let pct = interpolate_curve(&fan.curve, temp);
                            write_pwm(&fan.pwm_path, &fan.pwm_enable_path, pct_to_pwm(pct as i32));
                        }
                    }
                    FanMode::Auto => {
                        if fan.is_gpu {
                            // GPU em auto: controla por SOFTWARE com uma curva padrão suave,
                            // em vez de devolver pro driver (que fica oscilando 27-49%).
                            // Curva GPU padrão: <40°C→30%, 50→40%, 65→60%, 75→80%, 85+→100%.
                            if gpu_t > 0.0 {
                                let pct = gpu_default_pct(gpu_t);
                                write_pwm(&fan.pwm_path, &fan.pwm_enable_path, pct_to_pwm(pct));
                            }
                        } else {
                            // CPU em auto: controle por software com curva padrão,
                            // porque o SmartFan do nct6779 usa sensor errado.
                            if cpu_t > 0.0 {
                                let pct = cpu_default_pct(cpu_t);
                                write_pwm(&fan.pwm_path, &fan.pwm_enable_path, pct_to_pwm(pct));
                            }
                        }
                    }
                }
            }

            thread::sleep(Duration::from_secs(3));
        }
    });
}
