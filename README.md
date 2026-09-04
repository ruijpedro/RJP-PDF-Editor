# RJP PDF Editor V3.0 — OCR AutoFill Todas as Páginas

WebApp para GitHub Pages com ficha por defeito, edição PDF e OCR manuscrito Google Cloud Vision através do proxy seguro.

## V3.0
- OCR Pro processa todas as páginas importadas.
- Usa `fullTextAnnotation` e as coordenadas do Google Vision para associar escrita manuscrita aos campos da ficha.
- Preenche campos das páginas 1, 2, 3, 4 e 6, incluindo tabelas de agregado, rendimentos/despesas, saúde, trabalho, escola, habitação, observações e consentimento.
- Deteta checkboxes marcadas pela imagem da ficha.
- Mantém revisão dos valores antes de **Preencher ficha atual**.
- A página RGPD sem campos mantém-se intacta.
- Sessão V3.0 separada para não recuperar dados/layout antigos.

## OCR partilhado em vários PCs
A chave `VISION_API_KEY` continua **apenas no Apps Script**. Nunca a coloques no GitHub.

Para que outros PCs abram a WebApp já com o OCR configurado, podes preencher antes de publicar:

`public/ocr-config.json`
```json
{
  "endpoint": "https://script.google.com/macros/s/SEU_ID/exec",
  "token": "O_MESMO_PROXY_TOKEN_DO_APPS_SCRIPT"
}
```

O `PROXY_TOKEN` ficará visível no frontend se o colocares nesse ficheiro; serve apenas de barreira do proxy. A API key Google permanece protegida nas Propriedades do Script. Para maior segurança pública, deixa o ficheiro vazio e configura pelo botão ⚙ em cada PC.

## GitHub Pages
1. Carrega todo o conteúdo do ZIP na raiz do repositório.
2. Em **Settings → Pages**, escolhe **GitHub Actions**.
3. Faz push para `main` ou executa manualmente **WebApp - GitHub Pages**.

## Teste recomendado
Importa uma ficha antiga completa (todas as páginas), executa **OCR**, revê os campos sugeridos e carrega **Preencher ficha atual**. Percorre todas as páginas da ficha antes de Guardar PDF.
