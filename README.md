# RJP PDF Editor V2.4 — Scanner Pro

WebApp + Android + iOS. Abre por defeito a Ficha de Atendimento sem o espaço em branco do RGPD e acrescenta um digitalizador de arquivo antigo.

## Scanner Pro

- Fotografia direta com a câmara ou importação de imagens/PDF multipágina.
- Miniaturas e processamento em lote.
- Rodar, auto-recorte de margens e três perfis de melhoria: Manuscrito, Documento e Fotografia.
- OCR local em português com Tesseract.js, com revisão obrigatória antes de preencher a ficha.
- OCR Pro opcional via endpoint seguro (exemplo Google Cloud Vision em `backend/`).
- Extração assistida de Nome, data de nascimento, naturalidade, BI/CC, estado civil, nacionalidade, NISS/beneficiário, NIF, morada, código postal e contactos.
- Botão **Preencher ficha atual**; nada é gravado automaticamente sem revisão.
- O editor PDF, Guardar/Partilhar, Web, Android e iOS continuam no mesmo projeto.

## Privacidade

O OCR local processa no dispositivo/browser. O OCR Pro só envia a imagem quando o utilizador carrega explicitamente em **OCR Pro** e tiver configurado um endpoint. Para fichas com dados pessoais/sensíveis, valida internamente se o serviço cloud escolhido é adequado às regras da organização.

## Build

```bash
npm install
npm run build
```

GitHub Actions incluído para WebApp, Android e iOS.


## Importação otimizada para portátil
- Botão principal **Importar / OCR ficha antiga**.
- Importação de vários PDFs/imagens de uma vez.
- **Importar pasta** para lotes digitalizados guardados numa pasta.
- Arrastar e largar PDFs/JPG/PNG/WebP/BMP diretamente na janela do scanner.
- A câmara continua disponível, mas no PC a importação é agora o fluxo principal.
