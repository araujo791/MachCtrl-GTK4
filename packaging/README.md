# Empacotamento — MachCtrl 3.0

Arquivos para distribuição via AUR (Arch/CachyOS). Duas variantes:

- **`machctrl-bin`** (recomendado) — instala em **segundos** a partir de um
  binário pré-compilado hospedado nas releases do GitHub.
- **`machctrl`** — compila do fonte na máquina do usuário (~4-5 min).

## Publicar o `-bin` (rápido pro usuário)

### 1. Gerar a release pré-compilada (você faz uma vez por versão)

```bash
./packaging/make-release.sh
```

Isso compila e gera `machctrl-<versao>-x86_64.tar.gz` na raiz do projeto.

### 2. Criar a release no GitHub com o binário

```bash
gh release create v3.0.0 machctrl-3.0.0-x86_64.tar.gz \
    --title "MachCtrl 3.0.0" --notes "Release 3.0.0"
```

(ou pela interface web: Releases → Draft a new release → tag `v3.0.0` →
anexa o `.tar.gz`)

### 3. Publicar o PKGBUILD-bin no AUR

O `packaging/bin/PKGBUILD` já aponta pra essa URL. Publique no AUR como
`machctrl-bin`. O usuário instala com:

```bash
paru -S machctrl-bin      # instala em segundos, sem compilar
```

## Publicar o do fonte

```bash
paru -S machctrl          # compila na máquina (~5 min)
```

O `packaging/PKGBUILD` cuida disso.

## Atualização sobre a v2.0

Ambos usam `provides=('machctrl')` e substituem a versão 2.0 (Electron/Python),
desativando o serviço antigo no upgrade.

## O que a instalação faz

- Instala binários em `/opt/machctrl/` (app + daemon)
- Launcher em `/usr/bin/machctrl` (auto-eleva com sudo NOPASSWD)
- Ícone e `.desktop` (menu de apps)
- `/etc/sudoers.d/machctrl` NOPASSWD (abre sem senha)
- Serviço `machctrld` habilitado (controle de fans em background, persiste)
- Carrega o módulo `nct6775` (fans) no boot

## Nota de segurança

A regra sudoers NOPASSWD dá comodidade (abre sem senha) em troca de menos
segurança. Para um modelo mais restrito, veja as alternativas discutidas no
desenvolvimento.
