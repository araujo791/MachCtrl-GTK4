#!/bin/bash
# Launcher do MachCtrl. Auto-eleva pra root (via sudo NOPASSWD SETENV) preservando
# o ambiente gráfico do usuário. A regra sudoers libera /opt/machctrl/machctrl sem
# senha; passamos as variáveis como assignments ANTES do binário (o sudo casa a
# regra pelo caminho do binário, e SETENV autoriza as variáveis).

BIN="/opt/machctrl/machctrl"

# Já é root? só executa.
if [ "$(id -u)" -eq 0 ]; then
    exec "$BIN" "$@"
fi

# Loaders do pixbuf (senão o GTK como root falha: "Could not load a pixbuf").
PIXBUF_CACHE="$(find /usr/lib -name loaders.cache -path '*gdk-pixbuf*' 2>/dev/null | head -1)"

exec sudo \
    DISPLAY="${DISPLAY:-}" \
    XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}" \
    WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}" \
    XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-}" \
    GDK_PIXBUF_MODULE_FILE="${PIXBUF_CACHE}" \
    WEBKIT_DISABLE_COMPOSITING_MODE=1 \
    "$BIN" "$@"


