# RJP PDF Editor V1.9 — Web + Android + iOS

Uma única base Vite/JavaScript para editar PDFs, com três destinos:

- WebApp / GitHub Pages
- Android APK via Capacitor
- iPhone/iPad via Capacitor

## Funcionalidades

- Abrir PDFs reais pelo seletor de ficheiros.
- PDF permanece aberto durante toda a sessão.
- Selecionar texto existente e criar substituição editável.
- Adicionar texto e marcas.
- Arrastar/redimensionar caixas de edição.
- Desfazer, apagar, zoom, autosave da sessão.
- Guardar sem rasterizar as páginas.
- Em iOS/Android: grava o PDF editado em cache e abre a folha nativa de Partilha/Guardar em Ficheiros.
- Em Web: descarrega o PDF editado.

## GitHub Actions

- `webapp.yml`: publica GitHub Pages.
- `android.yml`: gera APK debug sem assinatura.
- `ios.yml`: gera `.app` para simulador iOS sem precisar de conta Apple.
- `ios-release.yml`: gera IPA assinado para TestFlight/App Store por execução manual.

## Secrets para IPA assinado

Configurar em GitHub > Settings > Secrets and variables > Actions:

- `APPLE_TEAM_ID`
- `IOS_CERT_P12_BASE64`
- `IOS_CERT_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`

Bundle ID: `pt.rjp.pdfeditor`

## Desenvolvimento local

```bash
npm ci
npm run build
```

Android:

```bash
npx cap add android
npx cap sync android
```

iOS (necessita macOS + Xcode):

```bash
npx cap add ios
npx cap sync ios
```

> A pasta `ios/` é criada no macOS/GitHub Actions. O GitHub consegue compilar a app iOS porque o workflow usa runner macOS.
