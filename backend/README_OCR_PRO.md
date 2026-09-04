# RJP OCR Proxy — Google Cloud Vision

O Apps Script usa duas **Propriedades do script**:

- `VISION_API_KEY` — chave Google Cloud restrita à Cloud Vision API.
- `PROXY_TOKEN` — token/password partilhado com a WebApp.

Publicar como **Aplicação Web**, executar como **Eu** e usar o URL terminado em `/exec`.

Teste GET esperado:

```json
{"ok":true,"service":"RJP OCR Proxy","status":"online"}
```

O proxy aceita `imageBase64` e devolve `text` + `fullTextAnnotation`. A V3.0 usa as coordenadas da anotação para associar o manuscrito aos campos de todas as páginas da ficha.
