// machctrld — daemon de controle de fans do MachCtrl.
//
// Roda como serviço systemd (root) desde o boot, independente da interface.
// Lê /etc/machctrl/fans.json e aplica os modos/curvas de fan continuamente,
// recarregando o arquivo periodicamente pra pegar mudanças feitas pelo app.
//
// É o mesmo modelo da v2.0 (backend rodando como serviço), mas em Rust.

mod fancontrol;
mod gpu;
mod hwmon;
mod procstat;

use std::sync::{Arc, Mutex};
use std::time::Duration;

fn main() {
    eprintln!("machctrld iniciando — controle de fans por software");

    // Carrega a config salva (curvas/modos definidos pelo app).
    let controller: fancontrol::SharedFanController =
        Arc::new(Mutex::new(fancontrol::load_config()));

    // Inicia a thread de controle (mesma lógica usada pelo app).
    fancontrol::spawn_control_thread(controller.clone());

    // Loop principal: recarrega a config periodicamente pra refletir mudanças
    // feitas pelo app (que escreve o arquivo ao alterar um fan).
    let mut last_mtime = config_mtime();
    loop {
        std::thread::sleep(Duration::from_secs(2));
        let mtime = config_mtime();
        if mtime != last_mtime {
            last_mtime = mtime;
            let fresh = fancontrol::load_config();
            if let Ok(mut guard) = controller.lock() {
                guard.fans = fresh.fans;
                eprintln!("machctrld: config recarregada ({} fans)", guard.fans.len());
            }
        }
    }
}

/// Retorna o mtime do arquivo de config (pra detectar mudanças).
fn config_mtime() -> Option<std::time::SystemTime> {
    std::fs::metadata(fancontrol::CONFIG_PATH)
        .and_then(|m| m.modified())
        .ok()
}
