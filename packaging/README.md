# Empacotamento — MachCtrl 3.0

Arquivos para distribuição via AUR (Arch/CachyOS).

## Instalar do AUR (quando publicado)

```bash
paru -S machctrl
# ou
yay -S machctrl
```

Isso **atualiza automaticamente** quem já tem a versão 2.0 instalada (mesmo
`pkgname=machctrl`, versão maior), desativando o serviço Python antigo.

## Instalar manualmente com este PKGBUILD

```bash
cd packaging
makepkg -si
```

## O que a instalação faz

- Compila o app Tauri (`npm run tauri build`)
- Instala o binário em `/opt/machctrl/machctrl`
- Instala o launcher em `/usr/bin/machctrl` (auto-eleva com sudo)
- Instala ícone e `.desktop` (aparece no menu de apps)
- Cria `/etc/sudoers.d/machctrl` com **NOPASSWD** para o binário — o app abre
  com privilégios **sem pedir senha**, permitindo ler slots de memória e
  controlar fans/energia
- Carrega o módulo `nct6775` (fans da placa-mãe) e garante no boot

## Após instalar

Abra pelo **menu de aplicativos** (ícone MachCtrl) ou pelo terminal:

```bash
machctrl
```

O app abre já com privilégios, tudo funcionando.

## Nota de segurança

A regra sudoers NOPASSWD dá comodidade (abre sem senha) em troca de menos
segurança: qualquer processo do usuário pode iniciar o app como root sem
autenticar. Para um modelo mais seguro (pedir senha 1x, ou helper daemon
isolado), veja as alternativas discutidas no desenvolvimento.
