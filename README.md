# MachCtrl

Monitor e Otimizador de Hardware para Linux — versão nativa com **Rust + Tauri v2 + React**.

Visual dark/light moderno, backend Rust lendo os sensores direto de `/proc` e `/sys`
(sem `sysinfo`, sem Electron, sem WebView pesado — usa o WebKitGTK do próprio sistema).

## Telas

- **Visão Geral** — cards de CPU/Memória/GPU com gráficos ao vivo, Top Processos (RAM) e Rede
- **CPU** — multi-socket (um card por CPU física), grid de núcleos com atividade + temperatura
- **Memória** — uso + pentes DIMM (via dmidecode)
- **Discos** — todas as partições com barra de uso
- **Fans** — RPM/PWM com slider de controle e modo Auto
- **Energia** — perfis Economia / Equilibrado / Desempenho
- **Limpeza** — tarefas de limpeza do sistema
- **Ajuste** — otimizações do sistema *(em construção)*

## Dependências do sistema (CachyOS / Arch)

```bash
sudo pacman -S --needed rust nodejs npm webkit2gtk-4.1 base-devel \
  curl wget file openssl gtk3 libappindicator-gtk3 librsvg
```

## Rodar em modo desenvolvimento

```bash
npm install
npm run tauri dev
```

## Compilar o app final

```bash
npm install
npm run tauri build
```

O binário/pacote sai em `src-tauri/target/release/` (e `bundle/` para .deb/.rpm/AppImage).

## Rodar com privilégios (recomendado)

Para ler os slots de memória, controlar fans, aplicar perfis de energia e ver o
consumo RAPL real, o app precisa de root. Use o script pronto:

```bash
./run-root.sh
```

Ele compila o binário (na primeira vez) e o executa com `pkexec`, preservando o
ambiente gráfico (X11 e Wayland). Vai pedir sua senha uma vez ao abrir.

> **Nota:** não use `pkexec npm run tauri dev` — o `pkexec` muda para o home do
> root e o npm não encontra o `package.json`. Sempre rode o binário compilado.

## Controle de fans e perfis de energia

Escrevem em `/sys`, então precisam de privilégios:

```bash
pkexec ./src-tauri/target/release/machctrl
```
