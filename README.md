# MachCtrl (GTK4 + libadwaita)

Reescrita completa do [MachCtrl](https://github.com/araujo791/machctrl) (originalmente
Electron + Python) e da tentativa anterior em [MachCtrl-3.0](https://github.com/araujo791/MachCtrl-3.0)
(Tauri + React). Esta versão é **Rust puro, sem WebView, sem Node, sem Python** —
GTK4 + libadwaita direto, igual a apps nativos do GNOME/KDE.

## Por que GTK4/libadwaita em vez de Tauri

| | Electron (2.x) | Tauri (3.0, abandonado) | GTK4 + libadwaita (este) |
|---|---|---|---|
| Tamanho do binário | ~272MB | ~20-30MB (estimado, nunca chegou a empacotar) | **~300KB** (linka contra libs já no sistema) |
| Runtime embutido | Chromium + Node | WebView do sistema + Node no dev | Nenhum — GTK4/libadwaita já fazem parte de qualquer KDE/GNOME |
| Visual | HTML/CSS (Tailwind) | HTML/CSS (Tailwind) | Nativo (libadwaita = mesmos widgets do GNOME Settings, Nautilus, etc.) |
| Linguagem do backend | Python (processo separado) | Rust (embutido) | Rust (embutido) |
| Frontend | React/TS | React/TS (reaproveitado) | Rust (gtk4-rs) |

A migração pro Tauri (ver `MachCtrl-3.0`) chegou a compilar e rodar, mas ainda carregava
WebKitGTK completo como motor de renderização só pra desenhar a mesma UI que widgets
nativos do GTK já desenham de fábrica — trocar React por widgets nativos elimina essa
camada inteira.

## Estado atual

🚧 **Esqueleto inicial.** A janela abre com header bar do libadwaita, mas as telas de
sensores ainda não foram construídas. Os módulos de leitura de hardware (`src/hwmon.rs`,
`src/power.rs`, `src/gpu.rs`, `src/cleaner.rs`, `src/profiles.rs`, `src/memory.rs`) foram
**reaproveitados 1:1** do trabalho já feito no MachCtrl-3.0 — são lógica pura, sem
dependência de framework de UI, então funcionam aqui sem alteração.

Falta:
- [ ] Construir as telas (CPU, GPU, Fans, RAM, Limpeza, Perfis) com widgets GTK4/libadwaita
- [ ] Loop de atualização de 1s ligado à UI (via `glib::timeout_add_seconds` ou canal + `glib::MainContext`)
- [ ] Portar `network.rs` (ainda não copiado pra este repo — depende de `sysinfo`, que tem
      restrição de toolchain em sandboxes com Rust antigo; precisa ser validado numa máquina
      com Rust atual antes de trazer)
- [ ] Aplicar estilo visual baseado nas prints do app original (aguardando upload das imagens)
- [ ] `.desktop` file, ícone, PKGBUILD próprio (bem mais simples que o do Electron — sem
      `electron-builder`, só `cargo build --release` + copiar o binário)

## Build

```bash
sudo pacman -S rust gtk4 libadwaita
cargo build --release
./target/release/machctrl
```

## Validação feita até agora

Compilado e linkado com sucesso neste ambiente (Ubuntu 24.04 + GTK4 4.14 + libadwaita 1.5.0
via apt), binário final de 344KB, dinamicamente linkado contra `libgtk-4`, `libadwaita-1`,
`libgobject`, `libcairo`, etc. — nenhuma dessas precisa ser empacotada junto, CachyOS com
KDE/GNOME já as tem instaladas por outras razões.
