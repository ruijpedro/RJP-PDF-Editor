# RJP PDF Editor V4.3.3.1 — Web + Android + Windows

Editor PDF universal sem ficha pré-carregada.

## Plataformas
- **WebApp** — publicada automaticamente no GitHub Pages.
- **Android** — APK debug gerado no GitHub Actions.
- **Windows** — instalador `.exe` x64 gerado com Electron + NSIS.

## Workflow único
Mantém apenas:

`.github/workflows/build.yml`

Apaga `android.yml`, `webapp.yml` ou outros workflows antigos para evitar builds duplicados.

## Windows
O job **Build Windows Installer** gera o artifact:

`RJP-PDF-Editor-Windows-v4.3.3`

Dentro encontrarás:

`RJP-PDF-Editor-Setup-4.3.3.exe`

O instalador permite escolher a pasta de instalação e cria atalhos no Ambiente de Trabalho e Menu Iniciar.

## Desenvolvimento local Windows
```bash
npm install
npm run desktop
```

Para gerar o instalador localmente:
```bash
npm run windows:dist
```

## Nota de assinatura
O instalador é gerado **sem assinatura de código**. O Windows SmartScreen pode mostrar um aviso de editor desconhecido. Para distribuição pública, pode ser adicionada assinatura Authenticode numa versão futura.


## V4.3.3
Workflow Windows robusto: upload por wildcard recursivo e validação explícita do EXE. Não reutilizar um run antigo; fazer novo commit/push para disparar este workflow.
