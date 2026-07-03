#!/bin/bash
# Empacota uma release pré-compilada do MachCtrl para o pacote -bin do AUR.
#
# Uso: ./packaging/make-release.sh
#
# Gera: machctrl-<versao>-x86_64.tar.gz  (no diretório do projeto)
# Depois é só anexar esse arquivo numa release do GitHub com a tag v<versao>.

set -e
cd "$(dirname "$0")/.."   # raiz do projeto

VERSION="$(grep '^version' src-tauri/Cargo.toml | head -1 | cut -d'"' -f2)"
OUT="machctrl-${VERSION}-x86_64"

echo "==> Compilando MachCtrl ${VERSION}…"
npm install --prefer-offline
npm run tauri build

echo "==> Montando o tarball da release…"
rm -rf "/tmp/${OUT}"
mkdir -p "/tmp/${OUT}"

# binários
cp src-tauri/target/release/machctrl   "/tmp/${OUT}/"
cp src-tauri/target/release/machctrld  "/tmp/${OUT}/"

# assets e arquivos de sistema
cp src/assets/app-icon.png             "/tmp/${OUT}/"
cp packaging/machctrl-launcher.sh      "/tmp/${OUT}/"
cp packaging/machctrl.desktop          "/tmp/${OUT}/"
cp packaging/machctrld.service         "/tmp/${OUT}/"

# empacota
tar -czf "${OUT}.tar.gz" -C /tmp "${OUT}"
rm -rf "/tmp/${OUT}"

# hash pra colocar no PKGBUILD (opcional; usamos SKIP por padrão)
SHA="$(sha256sum "${OUT}.tar.gz" | cut -d' ' -f1)"

echo ""
echo "  ✅  Release empacotada: ${OUT}.tar.gz"
echo "  sha256: ${SHA}"
echo ""
echo "  Próximos passos:"
echo "  1. Crie uma release no GitHub com a tag: v${VERSION}"
echo "     gh release create v${VERSION} ${OUT}.tar.gz --title \"MachCtrl ${VERSION}\" --notes \"Release ${VERSION}\""
echo "  2. O PKGBUILD-bin já aponta pra essa URL. Publique-o no AUR."
echo ""
