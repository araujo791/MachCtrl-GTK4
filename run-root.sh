#!/usr/bin/env bash
# Lança o MachCtrl com privilégios de root (via pkexec), preservando o ambiente
# gráfico do usuário. Assim os slots de memória, controle de fans, perfis de
# energia e o consumo RAPL real funcionam sem prompts extras — igual à v2.0.
#
# Uso: ./run-root.sh
#
# Na primeira vez, compila o binário se ele ainda não existir.

set -e
cd "$(dirname "$0")"

BIN="src-tauri/target/release/machctrl"

# Compila se o binário ainda não foi gerado
if [ ! -f "$BIN" ]; then
  echo "Binário não encontrado — compilando (isso pode levar alguns minutos na primeira vez)…"
  npm install
  npm run tauri build
  # o tauri build gera o binário em target/release/
fi

# Passa as variáveis gráficas pro root, senão a janela não abre.
# Cobre tanto X11 (DISPLAY/XAUTHORITY) quanto Wayland (WAYLAND_DISPLAY).
exec pkexec env \
  DISPLAY="${DISPLAY:-}" \
  XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}" \
  WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}" \
  XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-}" \
  WEBKIT_DISABLE_COMPOSITING_MODE=1 \
  "$PWD/$BIN"
