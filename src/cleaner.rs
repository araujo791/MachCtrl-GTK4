// Port de get_available_clean_tasks / run_clean_task
// (backend/machctrl_server.py linhas 660-877)

use glob::glob;
use serde::Serialize;
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Serialize, Clone)]
pub struct CleanTask {
    pub id: String,
    pub label: String,
    pub description: String,
    pub needs_root: bool,
}

#[derive(Serialize)]
pub struct CleanResult {
    pub success: bool,
    pub result: String,
    pub cleaned: Option<String>,
    pub bytes: u64,
}

fn which(bin: &str) -> bool {
    Command::new("which")
        .arg(bin)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn du(path: &str) -> u64 {
    Command::new("du")
        .args(["-sb", path])
        .output()
        .ok()
        .and_then(|o| {
            String::from_utf8_lossy(&o.stdout)
                .split_whitespace()
                .next()
                .and_then(|s| s.parse::<u64>().ok())
        })
        .unwrap_or(0)
}

fn fmt_size(b: u64) -> String {
    if b == 0 {
        return "0 B".to_string();
    }
    if b >= 1_073_741_824 {
        format!("{:.2} GB", b as f64 / 1_073_741_824.0)
    } else if b >= 1_048_576 {
        format!("{:.1} MB", b as f64 / 1_048_576.0)
    } else if b >= 1024 {
        format!("{:.0} KB", b as f64 / 1024.0)
    } else {
        format!("{b} B")
    }
}

/// Remove todos os arquivos que casam com os padrões glob informados, somando bytes liberados.
fn rm_glob(patterns: &[&str]) -> (u64, u32) {
    let mut freed = 0u64;
    let mut count = 0u32;
    for pattern in patterns {
        let Ok(paths) = glob(pattern) else { continue };
        for entry in paths.filter_map(|e| e.ok()) {
            let size = if entry.is_file() {
                fs::metadata(&entry).map(|m| m.len()).unwrap_or(0)
            } else {
                du(entry.to_string_lossy().as_ref())
            };
            let removed = if entry.is_dir() {
                fs::remove_dir_all(&entry).is_ok()
            } else {
                fs::remove_file(&entry).is_ok()
            };
            if removed {
                freed += size;
                count += 1;
            }
        }
    }
    (freed, count)
}

pub fn get_available_clean_tasks() -> Vec<CleanTask> {
    let mut tasks = vec![
        CleanTask { id: "pacman-cache".into(), label: "Cache do Pacman".into(), description: "Remove pacotes antigos (/var/cache/pacman/pkg)".into(), needs_root: true },
        CleanTask { id: "pacman-orphans".into(), label: "Pacotes Órfãos".into(), description: "Remove pacotes sem dependentes instalados".into(), needs_root: true },
        CleanTask { id: "journal-logs".into(), label: "Logs do Journal".into(), description: "Limpa logs do systemd (mantém últimos 7 dias)".into(), needs_root: true },
        CleanTask { id: "temp-files".into(), label: "Arquivos Temporários".into(), description: "Remove arquivos antigos de /tmp e /var/tmp".into(), needs_root: true },
        CleanTask { id: "thumb-cache".into(), label: "Cache de Miniaturas".into(), description: "Limpa thumbnails (~/.cache/thumbnails)".into(), needs_root: false },
        CleanTask { id: "coredumps".into(), label: "Core Dumps".into(), description: "Remove arquivos de crash do sistema".into(), needs_root: true },
    ];

    // Lixeira — mostra tamanho real, igual ao Python
    let mut trash_size = 0u64;
    if let Ok(homes) = glob("/home/*/") {
        for home in homes.filter_map(|h| h.ok()).chain(std::iter::once(std::path::PathBuf::from("/root/"))) {
            let trash_files = home.join(".local/share/Trash/files");
            if trash_files.exists() {
                trash_size += du(trash_files.to_string_lossy().as_ref());
            }
        }
    }
    let trash_desc = if trash_size > 0 {
        format!("Esvazia a lixeira — {} em uso", fmt_size(trash_size))
    } else {
        "Esvazia a lixeira (~/.local/share/Trash)".to_string()
    };
    tasks.push(CleanTask { id: "trash".into(), label: "Lixeira".into(), description: trash_desc, needs_root: false });

    let home = std::env::var("HOME").unwrap_or_default();

    if (which("pip3") || which("pip")) && Path::new(&format!("{home}/.cache/pip")).exists() {
        tasks.push(CleanTask { id: "pip-cache".into(), label: "Cache do Pip".into(), description: "Limpa cache Python (pip)".into(), needs_root: false });
    }
    if which("npm") && Path::new(&format!("{home}/.npm")).exists() {
        tasks.push(CleanTask { id: "npm-cache".into(), label: "Cache do npm".into(), description: "Limpa cache de pacotes Node.js (~/.npm)".into(), needs_root: false });
    }
    if which("yarn") && Path::new(&format!("{home}/.cache/yarn")).exists() {
        tasks.push(CleanTask { id: "yarn-cache".into(), label: "Cache do Yarn".into(), description: "Limpa cache do Yarn (~/.cache/yarn)".into(), needs_root: false });
    }
    if which("docker") && Path::new("/var/lib/docker").exists() {
        tasks.push(CleanTask { id: "docker-prune".into(), label: "Docker (imagens/containers)".into(), description: "Remove imagens e containers parados".into(), needs_root: true });
    }
    if which("flatpak") {
        tasks.push(CleanTask { id: "flatpak-unused".into(), label: "Flatpak não usados".into(), description: "Remove runtimes Flatpak desnecessários".into(), needs_root: false });
    }

    tasks
}

pub fn run_clean_task(task_id: &str) -> CleanResult {
    let home = std::env::var("HOME").unwrap_or_default();

    match task_id {
        "pacman-cache" => {
            let before = du("/var/cache/pacman/pkg");
            let _ = Command::new("paccache").args(["-rk1"]).output();
            let _ = Command::new("paccache").args(["-ruk0"]).output();
            let freed = before.saturating_sub(du("/var/cache/pacman/pkg"));
            CleanResult { success: true, result: "Cache limpo (1 versão mantida)".into(), cleaned: Some(fmt_size(freed)), bytes: freed }
        }
        "pacman-orphans" => {
            let r = Command::new("pacman").args(["-Qdtq"]).output();
            let orphans: Vec<String> = r
                .map(|o| String::from_utf8_lossy(&o.stdout).lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect())
                .unwrap_or_default();
            if orphans.is_empty() {
                return CleanResult { success: true, result: "Nenhum órfão encontrado".into(), cleaned: None, bytes: 0 };
            }
            let mut args = vec!["-Rns".to_string(), "--noconfirm".to_string()];
            args.extend(orphans.clone());
            let _ = Command::new("pacman").args(&args).output();
            CleanResult { success: true, result: format!("{} pacote(s) removido(s)", orphans.len()), cleaned: Some(format!("{} pacotes", orphans.len())), bytes: 0 }
        }
        "journal-logs" => {
            let before = du("/var/log/journal");
            let _ = Command::new("journalctl").args(["--vacuum-time=7d"]).output();
            let freed = before.saturating_sub(du("/var/log/journal"));
            CleanResult { success: true, result: "Logs compactados (7 dias mantidos)".into(), cleaned: Some(fmt_size(freed)), bytes: freed }
        }
        "temp-files" => {
            let (freed, count) = rm_glob(&["/tmp/*", "/var/tmp/*"]);
            CleanResult { success: true, result: format!("{count} itens removidos"), cleaned: Some(fmt_size(freed)), bytes: freed }
        }
        "thumb-cache" => {
            let cache = format!("{home}/.cache/thumbnails");
            let freed = du(&cache);
            let _ = fs::remove_dir_all(&cache);
            CleanResult { success: true, result: "Miniaturas removidas".into(), cleaned: Some(fmt_size(freed)), bytes: freed }
        }
        "coredumps" => {
            let (freed, count) = rm_glob(&["/var/lib/systemd/coredump/*", "/tmp/core*"]);
            let _ = Command::new("coredumpctl").arg("clean").output();
            CleanResult { success: true, result: format!("{count} core dump(s) removido(s)"), cleaned: Some(fmt_size(freed)), bytes: freed }
        }
        "trash" => {
            let mut homes: Vec<String> = glob("/home/*/").ok().map(|g| g.filter_map(|h| h.ok()).map(|p| p.to_string_lossy().trim_end_matches('/').to_string()).collect()).unwrap_or_default();
            homes.push("/root".to_string());

            let mut freed = 0u64;
            let mut count = 0u32;
            for h in &homes {
                for subdir in ["files", "info", "expunged"] {
                    let trash_path = format!("{h}/.local/share/Trash/{subdir}");
                    if !Path::new(&trash_path).exists() {
                        continue;
                    }
                    let (f, c) = rm_glob(&[&format!("{trash_path}/*")]);
                    freed += f;
                    count += c;
                }
            }
            // KDE: .Trash-UID em raízes de discos montados
            for pattern in ["/media/*/.Trash-*", "/mnt/*/.Trash-*", "/run/media/*/*/.Trash-*"] {
                if let Ok(roots) = glob(pattern) {
                    for root in roots.filter_map(|r| r.ok()) {
                        for subdir in ["files", "info"] {
                            let trash_path = root.join(subdir);
                            if trash_path.exists() {
                                let (f, c) = rm_glob(&[&format!("{}/*", trash_path.to_string_lossy())]);
                                freed += f;
                                count += c;
                            }
                        }
                    }
                }
            }
            if count == 0 {
                CleanResult { success: true, result: "Lixeira já está vazia".into(), cleaned: None, bytes: 0 }
            } else {
                CleanResult { success: true, result: format!("{count} item(s) removido(s)"), cleaned: Some(fmt_size(freed)), bytes: freed }
            }
        }
        "pip-cache" => {
            let cache = format!("{home}/.cache/pip");
            let freed = du(&cache);
            let _ = fs::remove_dir_all(&cache);
            let pip_cmd = if which("pip3") { "pip3" } else { "pip" };
            let _ = Command::new(pip_cmd).args(["cache", "purge"]).output();
            CleanResult { success: true, result: "Cache pip limpo".into(), cleaned: Some(fmt_size(freed)), bytes: freed }
        }
        "npm-cache" => {
            let cache = format!("{home}/.npm");
            let freed = du(&cache);
            let _ = Command::new("npm").args(["cache", "clean", "--force"]).output();
            CleanResult { success: true, result: "Cache npm limpo".into(), cleaned: Some(fmt_size(freed)), bytes: freed }
        }
        "yarn-cache" => {
            let cache = format!("{home}/.cache/yarn");
            let freed = du(&cache);
            let _ = Command::new("yarn").args(["cache", "clean"]).output();
            CleanResult { success: true, result: "Cache yarn limpo".into(), cleaned: Some(fmt_size(freed)), bytes: freed }
        }
        "docker-prune" => {
            let r = Command::new("docker").args(["system", "prune", "-f"]).output();
            let freed = r
                .map(|o| {
                    String::from_utf8_lossy(&o.stdout)
                        .lines()
                        .find(|l| l.to_lowercase().contains("reclaimed"))
                        .and_then(parse_docker_size)
                        .unwrap_or(0)
                })
                .unwrap_or(0);
            CleanResult { success: true, result: "Docker limpo".into(), cleaned: Some(if freed > 0 { fmt_size(freed) } else { "feito".into() }), bytes: freed }
        }
        "flatpak-unused" => {
            let r = Command::new("flatpak").args(["uninstall", "--unused", "-y"]).output();
            let removed = r
                .map(|o| String::from_utf8_lossy(&o.stdout).lines().filter(|l| l.contains("Removing")).count())
                .unwrap_or(0);
            CleanResult {
                success: true,
                result: if removed > 0 { format!("{removed} runtime(s) removido(s)") } else { "Nenhum runtime desnecessário".into() },
                cleaned: if removed > 0 { Some(format!("{removed} pacotes")) } else { None },
                bytes: 0,
            }
        }
        other => CleanResult { success: false, result: format!("Tarefa desconhecida: {other}"), cleaned: Some("—".into()), bytes: 0 },
    }
}

/// Extrai algo como "1.2GB" da saída do `docker system prune` e converte pra bytes.
fn parse_docker_size(line: &str) -> Option<u64> {
    let re = regex_lite_find(line)?;
    Some(re)
}

fn regex_lite_find(line: &str) -> Option<u64> {
    // parsing manual simples (sem trazer a crate `regex` só por isso): procura um número
    // seguido de unidade (B, kB, MB, GB) na linha.
    let units = [("GB", 1_073_741_824f64), ("MB", 1_048_576f64), ("kB", 1024f64), ("B", 1f64)];
    for (unit, mult) in units {
        if let Some(pos) = line.find(unit) {
            let prefix = &line[..pos];
            let num: String = prefix.chars().rev().take_while(|c| c.is_ascii_digit() || *c == '.').collect();
            let num: String = num.chars().rev().collect();
            if let Ok(v) = num.parse::<f64>() {
                return Some((v * mult) as u64);
            }
        }
    }
    None
}
