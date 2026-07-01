#!/bin/bash
# Launcher do MachCtrl. Auto-eleva pra root (via sudo NOPASSWD configurado na
# instalação) preservando o ambiente gráfico do usuário, pra que a leitura de
# slots de memória, controle de fans, perfis de energia etc. funcionem sem
# pedir senha — como fazia a v2.0.

BIN="/opt/machctrl/machctrl"

# Já é root? só executa.
if [ "$(id -u)" -eq 0 ]; then
    exec "$BIN" "$@"
fi

# Preserva variáveis gráficas pra janela abrir quando rodando como root.
exec sudo -E env \
    DISPLAY="${DISPLAY:-}" \
    XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}" \
    WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}" \
    XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-}" \
    SUDO_USER="${USER}" \
    WEBKIT_DISABLE_COMPOSITING_MODE=1 \
    "$BIN" "$@"
