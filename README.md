# RJP PDF Editor V2.9 — OCR AutoFill

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


## V2.8
- Campo multilinha clicável e invisível sob Observações do Agregado Familiar.
- Mantém as linhas originais do PDF; sem caixa visível e sem texto cinzento/placeholder.
- O conteúdo fica persistente no PDF guardado.


## V2.9
- OCR Pro reconhece os principais campos da página 1 e o primeiro elemento do agregado familiar.
- Botão “Preencher ficha atual” aplica os campos reconhecidos diretamente aos campos AcroForm da ficha.
- Reconhecimento de datas, checkboxes, processo familiar, identificação, morada, contactos, agregado e observações.
- Painel de revisão permite corrigir cada valor antes de preencher.
