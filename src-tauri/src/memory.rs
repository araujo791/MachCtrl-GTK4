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

/// Versão que roda o dmidecode com privilégio via pkexec (abre prompt gráfico de
/// senha). Usada sob demanda quando a leitura sem-root falha. Retorna None se o
/// usuário cancelar a senha ou o pkexec não estiver disponível.
pub fn get_memory_slots_pkexec() -> Option<MemorySlotsInfo> {
    let output = Command::new("pkexec").args(["dmidecode", "-t", "17"]).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    if !stdout.contains("Memory Device") {
        return None;
    }
    let info = parse_dmidecode_blocks(&stdout);
    if info.occupied_slots > 0 {
        Some(info)
    } else {
        None
    }
}

/// Equivalente a get_memory_info() (parte de slots): tenta primeiro ler o SMBIOS
/// direto do sysfs (SEM root), depois dmidecode/sudo, e por fim heurística.
pub fn get_memory_slots(total_gb: f64) -> MemorySlotsInfo {
    // 1) Tenta o SMBIOS bruto do kernel (/sys/firmware/dmi/tables) — legível sem root
    //    na maioria dos sistemas, ao contrário do dmidecode que abre /dev/mem.
    if let Some(info) = read_smbios_from_sysfs() {
        if info.occupied_slots > 0 {
            return info;
        }
    }

    // 2) dmidecode direto ou via sudo não-interativo
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

    // 3) Heurística: encaixa o total de RAM em módulos de tamanho comum
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

/// Lê e parseia as tabelas SMBIOS diretamente de /sys/firmware/dmi/tables/DMI,
/// que o kernel expõe e normalmente é legível sem root (diferente do /dev/mem que
/// o dmidecode usa). Extrai as estruturas Type 17 (Memory Device).
fn read_smbios_from_sysfs() -> Option<MemorySlotsInfo> {
    let data = std::fs::read("/sys/firmware/dmi/tables/DMI").ok()?;
    let strings_intact = &data;
    let mut info = MemorySlotsInfo::default();
    let mut pos = 0usize;

    while pos + 4 <= strings_intact.len() {
        let struct_type = strings_intact[pos];
        let length = strings_intact[pos + 1] as usize;
        if length < 4 || pos + length > strings_intact.len() {
            break;
        }

        // Formatação: área formatada [pos..pos+length], depois strings terminadas
        // por \0\0. Precisamos localizar o fim do conjunto de strings.
        let formatted = &strings_intact[pos..pos + length];
        let mut str_end = pos + length;
        while str_end + 1 < strings_intact.len()
            && !(strings_intact[str_end] == 0 && strings_intact[str_end + 1] == 0)
        {
            str_end += 1;
        }
        // aponta pra depois do terminador duplo
        let strings_area = &strings_intact[pos + length..str_end.min(strings_intact.len())];

        if struct_type == 17 {
            info.total_slots += 1;
            if let Some(slot) = parse_type17(formatted, strings_area) {
                info.occupied_slots += 1;
                info.slots.push(slot);
            }
        }

        // avança pro próximo (pula o \0\0 final)
        pos = str_end + 2;
        if struct_type == 127 {
            break; // End-of-table
        }
    }

    if info.total_slots > 0 {
        Some(info)
    } else {
        None
    }
}

/// Extrai a i-ésima string (1-indexed) da área de strings de uma estrutura SMBIOS.
fn smbios_string(strings_area: &[u8], index: u8) -> String {
    if index == 0 {
        return String::new();
    }
    strings_area
        .split(|&b| b == 0)
        .nth((index - 1) as usize)
        .map(|s| String::from_utf8_lossy(s).trim().to_string())
        .unwrap_or_default()
}

fn u16_at(data: &[u8], off: usize) -> u16 {
    if off + 1 < data.len() {
        u16::from_le_bytes([data[off], data[off + 1]])
    } else {
        0
    }
}

/// Parseia uma estrutura SMBIOS Type 17 (Memory Device). Offsets conforme a spec
/// DMTF SMBIOS. Retorna None se o slot estiver vazio (Size == 0).
fn parse_type17(fmt: &[u8], strings: &[u8]) -> Option<MemorySlot> {
    // Size está no offset 0x0C (2 bytes). 0 = slot vazio; 0xFFFF = desconhecido.
    let size_raw = u16_at(fmt, 0x0C);
    let locator = smbios_string(strings, *fmt.get(0x10).unwrap_or(&0));
    let bank = smbios_string(strings, *fmt.get(0x11).unwrap_or(&0));

    if size_raw == 0 {
        return None; // slot vazio
    }
    // Se bit 15 setado, valor em KB; senão em MB.
    let size_gb = if size_raw == 0x7FFF {
        // Extended Size no offset 0x1C (4 bytes), em MB
        let ext = if fmt.len() >= 0x20 {
            u32::from_le_bytes([fmt[0x1C], fmt[0x1D], fmt[0x1E], fmt[0x1F]])
        } else {
            0
        };
        ext as f64 / 1024.0
    } else if size_raw & 0x8000 != 0 {
        (size_raw & 0x7FFF) as f64 / 1024.0 / 1024.0 // KB -> GB
    } else {
        size_raw as f64 / 1024.0 // MB -> GB
    };

    // Type no offset 0x12 (1 byte, enum)
    let mem_type = match fmt.get(0x12).copied().unwrap_or(0) {
        0x1A => "DDR4",
        0x1B => "LPDDR",
        0x1C => "LPDDR2",
        0x1D => "LPDDR3",
        0x1E => "LPDDR4",
        0x18 => "DDR3",
        0x22 => "DDR5",
        0x23 => "LPDDR5",
        _ => "?",
    }
    .to_string();

    // Speed no offset 0x15 (2 bytes, MT/s)
    let speed_mhz = u16_at(fmt, 0x15) as i64;
    // Configured Speed no offset 0x20 (2 bytes)
    let configured_speed_mhz = u16_at(fmt, 0x20) as i64;
    // Manufacturer (string idx no offset 0x17), Part Number (0x1A), Serial (0x18)
    let manufacturer = {
        let m = smbios_string(strings, *fmt.get(0x17).unwrap_or(&0));
        if m.is_empty() || matches!(m.as_str(), "Unknown" | "Not Specified" | "Undefined") {
            "?".to_string()
        } else {
            m
        }
    };
    let serial = smbios_string(strings, *fmt.get(0x18).unwrap_or(&0));
    let part_number = {
        let p = smbios_string(strings, *fmt.get(0x1A).unwrap_or(&0));
        if p.is_empty() { "?".to_string() } else { p }
    };
    // Configured Voltage no offset 0x26 (2 bytes, mV)
    let voltage = {
        let mv = u16_at(fmt, 0x26);
        if mv > 0 { mv as f64 / 1000.0 } else { 0.0 }
    };

    Some(MemorySlot {
        locator: if locator.is_empty() { "?".into() } else { locator },
        bank,
        size_gb,
        mem_type,
        speed_mhz,
        configured_speed_mhz,
        voltage,
        manufacturer,
        part_number,
        serial,
        rank: 0,
    })
}

