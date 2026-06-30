// Port de _parse_dmidecode_blocks / get_memory_info (parte de slots)
// (backend/machctrl_server.py linhas 278-376)

use std::process::Command;

#[derive(Clone, Debug)]
pub struct MemorySlot {
    pub locator: String,
    pub bank: String,
    pub size_gb: f64,
    pub mem_type: String,
    pub speed_mhz: i64,
    pub configured_speed_mhz: i64,
    pub voltage: f64,
    pub manufacturer: String,
    pub part_number: String,
    pub serial: String,
    pub rank: i64,
}

#[derive(Clone, Debug, Default)]
pub struct MemorySlotsInfo {
    pub slots: Vec<MemorySlot>,
    pub total_slots: u32,
    pub occupied_slots: u32,
}

/// Extrai o valor de um campo "Campo: valor" dentro de um bloco de texto do dmidecode.
/// `multiword` permite nomes de campo com espaço (ex: "Bank Locator").
fn field<'a>(block: &'a str, field_name: &str) -> Option<&'a str> {
    for line in block.lines() {
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix(field_name) {
            if let Some(value) = rest.strip_prefix(':') {
                return Some(value.trim());
            }
        }
    }
    None
}

fn parse_size_to_gb(size_text: &str) -> Option<f64> {
    if size_text.contains("No Module") || size_text.contains("Not Installed") || size_text == "0" {
        return None;
    }
    let mut parts = size_text.split_whitespace();
    let val: f64 = parts.next()?.parse().ok()?;
    let unit = parts.next()?.to_lowercase();
    Some(match unit.as_str() {
        "kb" | "kib" => (val / (1024.0 * 1024.0) * 100.0).round() / 100.0,
        "mb" | "mib" => (val / 1024.0 * 10.0).round() / 10.0,
        "tb" | "tib" => val * 1024.0,
        _ => val, // gb, gib
    })
}

/// Equivalente a _parse_dmidecode_blocks(): separa a saída em blocos "Memory Device" e
/// extrai os campos relevantes de cada pente de RAM.
fn parse_dmidecode_blocks(output: &str) -> MemorySlotsInfo {
    let mut info = MemorySlotsInfo::default();

    // Divide a saída em blocos a cada ocorrência da linha "Memory Device"
    let blocks: Vec<&str> = output.split("Memory Device").skip(1).collect();

    for block in blocks {
        if !block.contains("Size:") {
            continue;
        }
        info.total_slots += 1;

        let Some(size_text) = field(block, "Size") else { continue };
        let Some(size_gb) = parse_size_to_gb(size_text) else { continue };
        info.occupied_slots += 1;

        let speed_mhz = field(block, "Speed")
            .and_then(|s| s.split_whitespace().next())
            .and_then(|s| s.parse::<i64>().ok())
            .unwrap_or(0);
        let configured_speed_mhz = field(block, "Configured Memory Speed")
            .or_else(|| field(block, "Configured Clock Speed"))
            .and_then(|s| s.split_whitespace().next())
            .and_then(|s| s.parse::<i64>().ok())
            .unwrap_or(0);
        let voltage = field(block, "Configured Voltage")
            .or_else(|| field(block, "Minimum Voltage"))
            .and_then(|s| s.split_whitespace().next())
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(0.0);
        let mem_type = field(block, "Type").unwrap_or("?").split_whitespace().next().unwrap_or("?").to_string();
        let locator = field(block, "Locator").unwrap_or("?").to_string();
        let bank = field(block, "Bank Locator").unwrap_or("").to_string();
        let mut manufacturer = field(block, "Manufacturer").unwrap_or("?").to_string();
        if matches!(manufacturer.as_str(), "Unknown" | "Not Specified" | "Undefined" | "") {
            manufacturer = "?".to_string();
        }
        let part_number = field(block, "Part Number").unwrap_or("?").to_string();
        let serial = field(block, "Serial Number").unwrap_or("").to_string();
        let rank = field(block, "Rank").and_then(|s| s.parse::<i64>().ok()).unwrap_or(0);

        info.slots.push(MemorySlot {
            locator,
            bank,
            size_gb,
            mem_type,
            speed_mhz,
            configured_speed_mhz,
            voltage,
            manufacturer,
            part_number,
            serial,
            rank,
        });
    }

    info
}

/// Equivalente a get_memory_info() (parte de slots): tenta dmidecode direto, depois
/// `sudo -n dmidecode` (não-interativo — só funciona se já configurado sem senha),
/// e por fim heurística baseada no total de RAM se tudo falhar.
pub fn get_memory_slots(total_gb: f64) -> MemorySlotsInfo {
    for (cmd, args) in [("dmidecode", vec!["-t", "17"]), ("sudo", vec!["-n", "dmidecode", "-t", "17"])] {
        if let Ok(output) = Command::new(cmd).args(&args).output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if output.status.success() && stdout.contains("Memory Device") {
                let info = parse_dmidecode_blocks(&stdout);
                if info.occupied_slots > 0 {
                    return info;
                }
            }
        }
    }

    // Heurística: tenta encaixar o total de RAM em módulos de tamanho comum (4/8/16/32/64GB)
    for module_size in [64.0, 32.0, 16.0, 8.0, 4.0] {
        if total_gb % module_size < 0.5 {
            let n_modules = (total_gb / module_size).round() as u32;
            if (1..=16).contains(&n_modules) {
                let slots = (0..n_modules)
                    .map(|i| MemorySlot {
                        locator: format!("DIMM {}", i + 1),
                        bank: String::new(),
                        size_gb: module_size,
                        mem_type: "?".into(),
                        speed_mhz: 0,
                        configured_speed_mhz: 0,
                        voltage: 0.0,
                        manufacturer: "?".into(),
                        part_number: "?".into(),
                        serial: String::new(),
                        rank: 0,
                    })
                    .collect();
                return MemorySlotsInfo { slots, total_slots: n_modules, occupied_slots: n_modules };
            }
        }
    }

    MemorySlotsInfo::default()
}
