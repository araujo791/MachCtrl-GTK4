// Port de find_hwmon_devices / find_temp_sensors / find_fan_sensors / find_all_pwm /
// read_sensor_file / set_fan_speed / set_fan_auto (backend/machctrl_server.py linhas 43-130, 1166-1235)

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::thread::sleep;
use std::time::Duration;

const HWMON_BASE: &str = "/sys/class/hwmon";

#[derive(Clone, Debug)]
pub struct TempSensor {
    pub label: String,
    pub value_c: f64,
    pub chip: String,
}

#[derive(Clone, Debug)]
pub struct FanSensor {
    pub id: String,
    pub label: String,
    pub rpm: i64,
    pub pct: i32,
    pub pwm_path: String,
    pub pwm_enable_path: Option<String>,
    pub chip: String,
}

/// Lê um arquivo de sensor (ex: temp1_input) e retorna o valor inteiro bruto.
pub fn read_sensor_file(path: &str) -> Option<i64> {
    fs::read_to_string(path).ok()?.trim().parse::<i64>().ok()
}

/// Equivalente a find_hwmon_devices(): mapeia nome do chip -> caminho /sys/class/hwmon/hwmonN
pub fn find_hwmon_devices() -> HashMap<String, PathBuf> {
    let mut devices = HashMap::new();
    let mut name_counts: HashMap<String, u32> = HashMap::new();

    let Ok(entries) = fs::read_dir(HWMON_BASE) else {
        return devices;
    };
    let mut paths: Vec<PathBuf> = entries.filter_map(|e| e.ok()).map(|e| e.path()).collect();
    paths.sort();

    for path in paths {
        let name_file = path.join("name");
        if let Ok(name) = fs::read_to_string(&name_file) {
            let name = name.trim().to_string();
            let unique_name = match name_counts.get(&name) {
                Some(&count) => {
                    name_counts.insert(name.clone(), count + 1);
                    format!("{name}_{}", count + 1)
                }
                None => {
                    name_counts.insert(name.clone(), 0);
                    name.clone()
                }
            };
            devices.insert(unique_name, path);
        }
    }
    devices
}

/// Lê todas as temperaturas de um chip hwmon (tempN_input + tempN_label)
pub fn read_temps_for_chip(chip_path: &PathBuf, chip_name: &str) -> Vec<TempSensor> {
    let mut temps = Vec::new();
    let Ok(entries) = fs::read_dir(chip_path) else {
        return temps;
    };
    let mut files: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().into_string().ok())
        .collect();
    files.sort();

    for f in files {
        if let Some(idx) = f.strip_prefix("temp").and_then(|s| s.strip_suffix("_input")) {
            let raw = read_sensor_file(chip_path.join(&f).to_str().unwrap_or_default());
            let Some(raw) = raw else { continue };
            let label_path = chip_path.join(format!("temp{idx}_label"));
            let label = fs::read_to_string(&label_path)
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|_| format!("Temp {idx}"));
            temps.push(TempSensor {
                label,
                value_c: raw as f64 / 1000.0,
                chip: chip_name.to_string(),
            });
        }
    }
    temps
}

/// Lê todos os fans de um chip hwmon (fanN_input + pwmN + pwmN_enable)
pub fn read_fans_for_chip(chip_path: &PathBuf, chip_name: &str) -> Vec<FanSensor> {
    let mut fans = Vec::new();
    let Ok(entries) = fs::read_dir(chip_path) else {
        return fans;
    };
    let mut files: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().into_string().ok())
        .collect();
    files.sort();

    for f in files {
        if let Some(idx) = f.strip_prefix("fan").and_then(|s| s.strip_suffix("_input")) {
            let rpm = read_sensor_file(chip_path.join(&f).to_str().unwrap_or_default()).unwrap_or(0);
            let label_path = chip_path.join(format!("fan{idx}_label"));
            let label = fs::read_to_string(&label_path)
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|_| format!("Fan {idx}"));
            let pwm_path = chip_path.join(format!("pwm{idx}"));
            let pwm_enable_path = chip_path.join(format!("pwm{idx}_enable"));
            let pct = read_sensor_file(pwm_path.to_str().unwrap_or_default())
                .map(|v| ((v as f64 / 255.0) * 100.0).round() as i32)
                .unwrap_or(0);
            fans.push(FanSensor {
                id: format!("{chip_name}_fan{idx}"),
                label,
                rpm,
                pct,
                pwm_path: pwm_path.to_string_lossy().to_string(),
                pwm_enable_path: if pwm_enable_path.exists() {
                    Some(pwm_enable_path.to_string_lossy().to_string())
                } else {
                    None
                },
                chip: chip_name.to_string(),
            });
        }
    }
    fans
}

/// Lê todas as temperaturas e fans de todo o sistema (todos os chips hwmon).
pub fn read_all_temps_and_fans() -> (Vec<TempSensor>, Vec<FanSensor>) {
    let devices = find_hwmon_devices();
    let mut temps = Vec::new();
    let mut fans = Vec::new();
    for (chip_name, path) in devices {
        temps.extend(read_temps_for_chip(&path, &chip_name));
        fans.extend(read_fans_for_chip(&path, &chip_name));
    }
    (temps, fans)
}

/// Equivalente a set_fan_speed(): força modo manual (1) e escreve o valor do PWM (0-255).
pub fn set_fan_speed(pwm_path: &str, pwm_enable_path: Option<&str>, speed_percent: i32) -> Result<(), String> {
    let pwm_value = ((speed_percent.clamp(0, 100) as f64) * 255.0 / 100.0).round() as i32;
    let pwm_value = pwm_value.clamp(0, 255);

    if let Some(enable_path) = pwm_enable_path {
        if PathBuf::from(enable_path).exists() {
            fs::write(enable_path, "1").map_err(|e| format!("sem permissão em {enable_path}: {e}"))?;
        }
    }
    fs::write(pwm_path, pwm_value.to_string()).map_err(|e| format!("erro ao escrever em {pwm_path}: {e}"))?;
    Ok(())
}

/// Equivalente a set_fan_auto(): tenta modo 2 (SmartFan), faz fallback pra modo 0 (BIOS).
pub fn set_fan_auto(pwm_enable_path: &str) -> Result<(), String> {
    if !PathBuf::from(pwm_enable_path).exists() {
        return Err(format!("{pwm_enable_path} não existe"));
    }
    fs::write(pwm_enable_path, "2").map_err(|e| format!("sem permissão (root necessário): {e}"))?;
    sleep(Duration::from_millis(150));

    let val = fs::read_to_string(pwm_enable_path).unwrap_or_default().trim().to_string();
    if val != "2" {
        fs::write(pwm_enable_path, "0").map_err(|e| format!("erro no fallback modo 0: {e}"))?;
        sleep(Duration::from_millis(100));
    }
    Ok(())
}
