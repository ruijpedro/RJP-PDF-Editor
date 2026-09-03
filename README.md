# RJP PDF Editor V1.0 — Ficha base

Esta versão usa a **Ficha de Atendimento** como documento-base real.

## O que faz
- Abre automaticamente a ficha editável de 6 páginas.
- Mostra o PDF real no browser com os campos sobrepostos na posição correta.
- Permite preencher pelo documento ou pelo painel lateral.
- Permite ditado por voz (`pt-PT`) quando o navegador suporta; no Android também funciona com o microfone do Gboard nos campos.
- **Guardar** e **Guardar como…** preservam o conteúdo original: o PDF não é convertido em imagem nem reconstruído.
- Os campos AcroForm são mantidos, portanto o PDF guardado pode ser reaberto no Adobe Reader ou novamente na WebApp e continuar a ser alterado.
- Também permite abrir um PDF previamente guardado desta ficha e recuperar os valores.

## GitHub Pages
Em Settings → Pages, seleciona **GitHub Actions**.
O workflow `.github/workflows/webapp.yml` compila com Node 22 e publica automaticamente.

URL esperada:
`https://ruijpedro.github.io/RJP-PDF-Editor/`

## Importante
Esta V1.0 resolve especificamente o fluxo da ficha-base. PDFs genéricos sem campos podem ser visualizados, mas a edição livre de texto interno continua em desenvolvimento.
