# RJP PDF Editor V4.3.3.1 — Web + Android + Windows

Editor PDF universal sem ficha pré-carregada.

## Plataformas
- **WebApp** — publicada automaticamente no GitHub Pages.
- **Android** — APK debug gerado no GitHub Actions.
- **Windows** — instalador `.exe` x64 gerado com Electron + NSIS.

## Workflow único
Mantém apenas:

`.github/workflows/build.yml`

Apaga `android.yml`, `webapp.yml` ou outros workflows antigos para evitar builds duplicados.

## Windows
O job **Build Windows Installer** gera o artifact:

`RJP-PDF-Editor-Windows-v4.3.3`

Dentro encontrarás:

`RJP-PDF-Editor-Setup-4.3.3.exe`

O instalador permite escolher a pasta de instalação e cria atalhos no Ambiente de Trabalho e Menu Iniciar.

## Desenvolvimento local Windows
```bash
npm install
npm run desktop
```

Para gerar o instalador localmente:
```bash
npm run windows:dist
```

## Nota de assinatura
O instalador é gerado **sem assinatura de código**. O Windows SmartScreen pode mostrar um aviso de editor desconhecido. Para distribuição pública, pode ser adicionada assinatura Authenticode numa versão futura.


## V4.3.3
Workflow Windows robusto: upload por wildcard recursivo e validação explícita do EXE. Não reutilizar um run antigo; fazer novo commit/push para disparar este workflow.


## V4.6 — Imagens e preservação do PDF
- Novo modo **Imagens** para selecionar fotografias/imagens existentes.
- Botão **Apagar** e tecla Delete ocultam a imagem através de uma camada PDF editável, sem rasterizar/reconstruir as restantes páginas.
- O conteúdo original, fontes, espaçamentos e restantes imagens não são recomprimidos.
- A remoção é gravada como objeto editável do próprio PDF.
- O tamanho do ficheiro pode variar ligeiramente após qualquer gravação PDF; não é tecnicamente possível garantir o mesmo número exato de bytes.


## V4.6
- Remoção de imagens sem moldura/annotation fantasma: a máscara é gravada diretamente no conteúdo da página, sem widget AcroForm.
- Inserção de imagens PNG/JPG/WebP (WebP é convertido para PNG antes de gravar).
- Imagens inseridas podem ser movidas, redimensionadas e apagadas antes de guardar; ao reabrir, continuam detetáveis pelo modo Imagens.
- Mantém WebApp, Android e Windows no mesmo workflow.


## V4.6
Interface unificada Windows/Web/Android, inserção imediata de imagens na página ativa e remoção visual sem moldura residual.


## V4.6.3 — correção de abertura de PDF
- Corrige erro `Cannot set properties of null (setting 'textContent')`.
- Adiciona o elemento `docName` à barra superior.
- Torna as atualizações da interface null-safe para Web, Android e Windows.
