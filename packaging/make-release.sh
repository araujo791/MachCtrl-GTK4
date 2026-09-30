#!/bin/bash
# Empacota uma release pré-compilada do MachCtrl para o pacote -bin do AUR.
#
# Uso: ./packaging/make-release.sh
#
# Gera: machctrl-<versao>-x86_64.tar.gz  (no diretório do projeto)
# Depois é só anexar esse arquivo numa release do GitHub com a tag v<versao>.

set -e
cd "$(dirname "$0")/.."   # raiz do projeto

# IMPORTANTE — compatibilidade de CPU:
# Este binário vai pro AUR (machctrl-bin) e roda em QUALQUER máquina que
# instalar, não só a nossa. Por isso SOBRESCREVEMOS aqui, explicitamente,
# qualquer CFLAGS/RUSTFLAGS herdado do ambiente (do shell, do
# /etc/makepkg.conf via `makepkg -si`, etc.) por um alvo genérico e portável.
#
# Sem isso, se a máquina que compila tiver "-C target-cpu=native" ou
# "-march=native" configurado (comum em distros tuned tipo CachyOS), o
# binário gerado só roda em CPUs com o mesmo conjunto de instruções da
# máquina de build — noutra CPU mais simples ele trava com
# "Illegal instruction" (SIGILL) ao tentar executar uma instrução que
# aquele processador não tem (ex: AVX2 de um Xeon rodando num i3 antigo).
#
# x86-64-v2 = baseline amplo (SSE3/SSE4.1/SSE4.2/POPCNT), compatível com
# praticamente qualquer CPU x86-64 desde ~2009 — sem AVX/AVX2/FMA.
export RUSTFLAGS="-C target-cpu=x86-64-v2"
export CFLAGS="-O2 -pipe"
export CXXFLAGS="-O2 -pipe"
unset MAKEFLAGS

echo "==> Flags de compilação forçadas para compatibilidade ampla:"
echo "    RUSTFLAGS=${RUSTFLAGS}"
echo "    CFLAGS=${CFLAGS}"
echo ""

VERSION="$(grep '^version' src-tauri/Cargo.toml | head -1 | cut -d'"' -f2)"
OUT="machctrl-${VERSION}-x86_64"

echo "==> Compilando MachCtrl ${VERSION}…"
npm install --prefer-offline
npm run tauri build

echo "==> Montando o tarball da release…"
rm -rf "/tmp/${OUT}"
mkdir -p "/tmp/${OUT}"

cp src-tauri/target/release/machctrl   "/tmp/${OUT}/"
cp src-tauri/target/release/machctrld  "/tmp/${OUT}/"
cp src/assets/app-icon.png             "/tmp/${OUT}/"
cp packaging/machctrl-launcher.sh      "/tmp/${OUT}/"
cp packaging/machctrl.desktop          "/tmp/${OUT}/"
cp packaging/machctrld.service         "/tmp/${OUT}/"

tar -czf "${OUT}.tar.gz" -C /tmp "${OUT}"
rm -rf "/tmp/${OUT}"

SHA="$(sha256sum "${OUT}.tar.gz" | cut -d' ' -f1)"

echo ""
echo "  ✅  Release empacotada: ${OUT}.tar.gz"
echo "  sha256: ${SHA}"
echo ""
