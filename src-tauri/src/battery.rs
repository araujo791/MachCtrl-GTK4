// Leitura de bateria e fonte de energia via /sys/class/power_supply.
// Só lê; não escreve nada. Se não há bateria (desktop), retorna None e a UI esconde tudo.

use std::fs;
use std::path::Path;

#[derive(Clone, Debug, Default, PartialEq, serde::Serialize)]
pub struct BatteryInfo {
    /// 0..100
    pub percent: f64,
    /// "charging" | "discharging" | "full" | "not_charging" | "unknown"
    pub status: String,
    /// Fonte de energia (adaptador) conectada
    pub ac_online: bool,
    /// Consumo (descarga) ou potência de carga atual, em watts. None se não der pra calcular.
    pub power_w: Option<f64>,
    /// Horas até esvaziar (descarregando) ou até encher (carregando)
    pub hours_left: Option<f64>,
    /// capacidade atual cheia / capacidade de fábrica, em %
    pub health_pct: Option<f64>,
    /// Capacidades em Wh (quando dá pra calcular)
    pub full_wh: Option<f64>,
    pub design_wh: Option<f64>,
    /// Ciclos de carga (None quando o firmware reporta 0, que é "não sabe")
    pub cycles: Option<i64>,
    pub voltage_v: Option<f64>,
    pub temp_c: Option<f64>,
    pub technology: Option<String>,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
}

fn read_str(p: &Path) -> Option<String> {
    let s = fs::read_to_string(p).ok()?;
    let s = s.trim();
    if s.is_empty() {
        None
    } else {
        Some(s.to_string())
    }
}

fn read_f64(p: &Path) -> Option<f64> {
    read_str(p)?.parse::<f64>().ok()
}

/// Lê a bateria principal e o estado do adaptador a partir de `root`
/// (normalmente /sys/class/power_supply).
pub fn read_battery_from(root: &Path) -> Option<BatteryInfo> {
    let entries = fs::read_dir(root).ok()?;
    let mut names: Vec<_> = entries.filter_map(|e| e.ok()).map(|e| e.path()).collect();
    names.sort();

    let mut ac_online = false;
    let mut bat_path = None;
    for p in &names {
        let ty = read_str(&p.join("type")).unwrap_or_default();
        match ty.as_str() {
            "Mains" | "USB" => {
                if read_f64(&p.join("online")).unwrap_or(0.0) >= 1.0 {
                    ac_online = true;
                }
            }
            "Battery" => {
                // ignora baterias de periféricos (mouse, fone...), que têm scope=Device
                if read_str(&p.join("scope")).as_deref() == Some("Device") {
                    continue;
                }
                if bat_path.is_none() {
                    bat_path = Some(p.clone());
                }
            }
            _ => {}
        }
    }
    let b = bat_path?;
    if read_f64(&b.join("present")).unwrap_or(1.0) < 1.0 {
        return None;
    }

    // Algumas baterias expõem energia (µWh), outras carga (µAh). Escolhe o par que existir.
    let (now, full, design, rate_raw, uses_energy) = if b.join("energy_full").exists() {
        (
            read_f64(&b.join("energy_now")),
            read_f64(&b.join("energy_full")),
            read_f64(&b.join("energy_full_design")),
            read_f64(&b.join("power_now")),
            true,
        )
    } else {
        (
            read_f64(&b.join("charge_now")),
            read_f64(&b.join("charge_full")),
            read_f64(&b.join("charge_full_design")),
            read_f64(&b.join("current_now")),
            false,
        )
    };

    let voltage_v = read_f64(&b.join("voltage_now")).map(|v| v / 1e6);
    let design_voltage_v = read_f64(&b.join("voltage_min_design"))
        .map(|v| v / 1e6)
        .filter(|v| *v > 0.0);

    let percent = read_f64(&b.join("capacity"))
        .or_else(|| match (now, full) {
            (Some(n), Some(f)) if f > 0.0 => Some(n / f * 100.0),
            _ => None,
        })?
        .clamp(0.0, 100.0);

    let status = match read_str(&b.join("status")).unwrap_or_default().to_lowercase().as_str() {
        "charging" => "charging",
        "discharging" => "discharging",
        "full" => "full",
        "not charging" => "not_charging",
        _ => "unknown",
    }
    .to_string();

    // Potência em watts: power_now (µW) direto, ou corrente (µA) × tensão (V).
    let power_w = rate_raw.and_then(|r| {
        let r = r.abs();
        if uses_energy {
            Some(r / 1e6)
        } else {
            voltage_v.map(|v| r / 1e6 * v)
        }
    });

    // Tempo restante: (quanto falta) / (taxa), na mesma unidade da taxa.
    let hours_left = match (status.as_str(), now, full, rate_raw) {
        ("discharging", Some(n), _, Some(r)) if r.abs() > 0.0 => Some(n / r.abs()),
        ("charging", Some(n), Some(f), Some(r)) if r.abs() > 0.0 && f > n => Some((f - n) / r.abs()),
        _ => None,
    }
    .filter(|h| h.is_finite() && *h > 0.0 && *h < 100.0);

    let health_pct = match (full, design) {
        (Some(f), Some(d)) if d > 0.0 => Some((f / d * 100.0).clamp(0.0, 100.0)),
        _ => None,
    };

    // Conversão pra Wh: energia já vem em µWh; carga (µAh) × tensão de projeto (ou atual).
    let to_wh = |raw: Option<f64>| -> Option<f64> {
        let raw = raw?;
        if uses_energy {
            Some(raw / 1e6)
        } else {
            design_voltage_v.or(voltage_v).map(|v| raw / 1e6 * v)
        }
    };

    let cycles = read_f64(&b.join("cycle_count")).map(|c| c as i64).filter(|c| *c > 0);
    // `temp` do power_supply vem em décimos de grau
    let temp_c = read_f64(&b.join("temp")).map(|t| t / 10.0).filter(|t| *t > 0.0 && *t < 120.0);

    Some(BatteryInfo {
        percent,
        status,
        ac_online,
        power_w,
        hours_left,
        health_pct,
        full_wh: to_wh(full),
        design_wh: to_wh(design),
        cycles,
        voltage_v,
        temp_c,
        technology: read_str(&b.join("technology")),
        model: read_str(&b.join("model_name")),
        manufacturer: read_str(&b.join("manufacturer")),
    })
}

pub fn read_battery() -> Option<BatteryInfo> {
    read_battery_from(Path::new("/sys/class/power_supply"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn w(dir: &Path, name: &str, val: &str) {
        fs::write(dir.join(name), format!("{val}\n")).unwrap();
    }

    fn fixture(tag: &str) -> std::path::PathBuf {
        let root = std::env::temp_dir().join(format!("machctrl-bat-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        root
    }

    // Dados reais do notebook do Anderson (Dell, BAT1 com charge_*, status Full).
    #[test]
    fn dell_inspiron_full() {
        let root = fixture("dell");
        let ac = root.join("ACAD");
        let bat = root.join("BAT1");
        fs::create_dir_all(&ac).unwrap();
        fs::create_dir_all(&bat).unwrap();
        w(&ac, "type", "Mains");
        w(&ac, "online", "1");
        for (k, v) in [
            ("type", "Battery"),
            ("status", "Full"),
            ("present", "1"),
            ("technology", "Li-ion"),
            ("cycle_count", "0"),
            ("voltage_min_design", "14800000"),
            ("voltage_now", "16600000"),
            ("current_now", "0"),
            ("charge_full_design", "2800000"),
            ("charge_full", "1678000"),
            ("charge_now", "1678000"),
            ("capacity", "100"),
            ("model_name", "DELL VN3N047E794"),
            ("manufacturer", "SIMPLO"),
        ] {
            w(&bat, k, v);
        }
        let b = read_battery_from(&root).expect("bateria");
        assert_eq!(b.percent, 100.0);
        assert_eq!(b.status, "full");
        assert!(b.ac_online);
        assert_eq!(b.cycles, None, "ciclo 0 = firmware não informa");
        assert!((b.health_pct.unwrap() - 59.92857).abs() < 0.01);
        assert_eq!(b.power_w, Some(0.0));
        assert_eq!(b.hours_left, None);
        // 2.8 Ah × 14.8 V = 41.44 Wh de projeto
        assert!((b.design_wh.unwrap() - 41.44).abs() < 0.01);
        assert!((b.voltage_v.unwrap() - 16.6).abs() < 1e-9);
        assert_eq!(b.model.as_deref(), Some("DELL VN3N047E794"));
    }

    #[test]
    fn discharging_with_energy_units() {
        let root = fixture("energy");
        let bat = root.join("BAT0");
        fs::create_dir_all(&bat).unwrap();
        for (k, v) in [
            ("type", "Battery"),
            ("status", "Discharging"),
            ("energy_full_design", "50000000"),
            ("energy_full", "40000000"),
            ("energy_now", "20000000"),
            ("power_now", "10000000"),
            ("voltage_now", "11400000"),
            ("cycle_count", "312"),
            ("capacity", "50"),
        ] {
            w(&bat, k, v);
        }
        let b = read_battery_from(&root).expect("bateria");
        assert_eq!(b.status, "discharging");
        assert!(!b.ac_online);
        assert!((b.power_w.unwrap() - 10.0).abs() < 1e-9);
        assert!((b.hours_left.unwrap() - 2.0).abs() < 1e-9);
        assert!((b.health_pct.unwrap() - 80.0).abs() < 1e-9);
        assert_eq!(b.cycles, Some(312));
    }

    #[test]
    fn charging_time_to_full_from_current() {
        let root = fixture("charge");
        let bat = root.join("BAT0");
        fs::create_dir_all(&bat).unwrap();
        for (k, v) in [
            ("type", "Battery"),
            ("status", "Charging"),
            ("charge_full_design", "4000000"),
            ("charge_full", "4000000"),
            ("charge_now", "2000000"),
            ("current_now", "1000000"),
            ("voltage_now", "12000000"),
            ("voltage_min_design", "11400000"),
            ("capacity", "50"),
        ] {
            w(&bat, k, v);
        }
        let b = read_battery_from(&root).expect("bateria");
        assert!((b.hours_left.unwrap() - 2.0).abs() < 1e-9);
        assert!((b.power_w.unwrap() - 12.0).abs() < 1e-9);
    }

    #[test]
    fn desktop_without_battery_and_peripheral_ignored() {
        let root = fixture("desk");
        let mouse = root.join("hid-mouse-battery");
        fs::create_dir_all(&mouse).unwrap();
        w(&mouse, "type", "Battery");
        w(&mouse, "scope", "Device");
        w(&mouse, "capacity", "80");
        assert_eq!(read_battery_from(&root), None);
        assert_eq!(read_battery_from(Path::new("/nonexistent-path-xyz")), None);
    }
}
