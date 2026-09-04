## V2.6.1 — Botão OCR simplificado
- Interface com um único botão principal **OCR**.
- O OCR manuscrito Pro é usado quando o endpoint está configurado.
- A configuração fica no botão ⚙.

# RJP PDF Editor V2.5 — Scanner Pro

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


## V2.5 - correção Observações Situação Económica
- Repõe as quatro células editáveis de Observações da página 3.
- Mostra os campos AcroForm com contorno discreto para ser claro onde se escreve.
- Inclui fallback por coordenadas para os quatro campos P3_texto_092 a P3_texto_095.
- Invalida a sessão antiga para evitar cache de layout anterior.


## V2.6 — OCR Manuscrito Pro
- OCR Manuscrito Pro passa a ser o botão principal para fichas manuscritas.
- OCR local/Tesseract fica identificado como adequado sobretudo a texto impresso.
- PDF importado é renderizado a 3× para preservar traços finos.
- O modo manuscrito deixa de binarizar agressivamente a imagem, evitando apagar lápis/esferográfica clara.
- OCR Pro usa duas passagens (imagem original + melhorada) e escolhe automaticamente o resultado mais consistente.
- Language hints: pt / pt-PT.
