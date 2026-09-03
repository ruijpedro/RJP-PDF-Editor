# RJP PDF Editor V2.2 - Ficha por defeito

Projeto único para WebApp, Android e iOS.

## Comportamento principal
- Abre automaticamente `Ficha_atendimento_Patricia_PDF_PREENCHIVEL_SEM_ESPACO_RGPD.pdf` ao iniciar.
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


## V2.2
Ficha padrão corrigida: a página RGPD inicia no topo da página, sem o grande espaço em branco. O documento padrão passa de 7 para 6 páginas, mantendo os campos editáveis; os campos de consentimento e assinatura foram reposicionados na nova página 6.


## V2.2
A sessão local é versionada. Ao publicar esta versão, sessões antigas são limpas automaticamente para impedir que o browser restaure a ficha anterior com o espaço em branco no RGPD.
