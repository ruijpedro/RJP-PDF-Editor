# OCR Pro opcional — Google Cloud Vision

O RJP Scanner Pro funciona sem servidor através de Tesseract.js. Para manuscritos difíceis, podes ligar um endpoint Google Cloud Vision sem expor a chave no GitHub.

1. Ativa **Cloud Vision API** no projeto Google Cloud.
2. Cria uma API key e restringe-a à Cloud Vision API.
3. Cria um projeto Google Apps Script e cola `google-vision-proxy.gs`.
4. Em **Definições do projeto → Propriedades do script**, cria `GOOGLE_VISION_API_KEY` e `RJP_OCR_TOKEN`.
5. Publica como Web App e copia o URL `/exec`.
6. Na app: **Digitalizar ficha antiga → ⚙ OCR Pro** e guarda endpoint + token.

Não coloques a chave Google no `src/`, no GitHub nem em `localStorage`. A app guarda apenas o URL do proxy e o token de acesso localmente no dispositivo.
