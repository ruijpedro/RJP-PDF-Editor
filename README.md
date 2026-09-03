# RJP PDF Editor V2.0 - Ficha por defeito

Projeto único para WebApp, Android e iOS.

## Comportamento principal
- Abre automaticamente `Ficha_atendimento_Patricia_PDF_PREENCHIVEL.pdf` ao iniciar.
- Os campos AcroForm da ficha ficam editáveis diretamente na app.
- Mantém edição livre de texto, adicionar texto e marcações.
- AutoSave da sessão no dispositivo/browser.
- `Nova ficha` / `Repor ficha` volta ao modelo original em branco.
- `Abrir outro PDF` continua disponível.
- Guardar preserva o PDF e preenche os campos do formulário.

## Plataformas
- Web: GitHub Pages
- Android: Capacitor / APK
- iOS: Capacitor / Xcode / TestFlight

O mesmo PDF base está em `public/templates/`, por isso é empacotado no build Web, Android e iOS.
