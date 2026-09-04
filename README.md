# RJP PDF Editor V2.7 — WebApp Only

Versão limpa apenas para WebApp/GitHub Pages.

## Inclui
- Ficha de Atendimento corrigida como documento padrão.
- Edição de campos PDF e texto livre.
- Guardar/partilhar PDF no browser.
- Importar ficheiros e pasta para OCR.
- OCR local e suporte OCR Pro através do proxy em `backend/`.
- Correção das células de Observações da Situação Económica.
- Apenas o workflow `.github/workflows/webapp.yml`.

## GitHub Pages
1. Carregar todo o conteúdo deste ZIP para a raiz do repositório.
2. Em **Settings → Pages**, escolher **GitHub Actions**.
3. Fazer push para `main` ou executar manualmente o workflow **WebApp - GitHub Pages**.

## Desenvolvimento local
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
