# RJP PDF Editor Universal V4.1

WebApp genérica, sem ficha/modelo incorporado.

## Funções
- Abrir qualquer PDF.
- Editar campos AcroForm existentes.
- Clicar em texto existente e substituí-lo.
- `Tornar editável`: converte linhas de texto em campos PDF editáveis persistentes.
- Adicionar texto e marcações.
- OCR para páginas digitalizadas através do proxy Google Vision já usado no projeto.
- Guardar como `*_EDITAVEL.pdf` mantendo os novos campos editáveis.
- AutoSave local da sessão.

## OCR
Na WebApp usa `⚙ OCR` para indicar o endpoint `/exec` e o `PROXY_TOKEN`.
A `VISION_API_KEY` continua apenas nas propriedades do Apps Script.

## GitHub Pages
O workflow `.github/workflows/webapp.yml` publica automaticamente o `dist`.


## V4.1 — Tipografia dos campos
Seleciona um campo de texto do PDF ou um campo criado pelo editor e altera **Fonte** e **Tamanho** na barra superior. Inclui Helvetica, Times Roman e Courier, com variantes negrito/itálico. Os valores são gravados nas aparências AcroForm do próprio PDF.
