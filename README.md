# RJP PDF Editor V0.8 — Guardar Seguro

Esta versão corrige o problema em que alguns PDFs guardados pela V0.7 podiam abrir em branco no Adobe Acrobat.

## Alteração principal

O botão **Guardar PDF** deixa de regravar diretamente a estrutura interna do PDF original. A V0.8 renderiza cada página, cria um PDF novo compatível, reaplica as alterações e só permite o download depois de validar que o resultado contém páginas e conteúdo visível.

O PDF continua a guardar os dados de reedição RJP como anexos internos, para poder ser reaberto na WebApp e continuar a edição.

## GitHub Pages

A pasta `.github/workflows/webapp.yml` está incluída e publica automaticamente a WebApp.

# RJP PDF Editor V0.7

WebApp para GitHub Pages.

## O que muda nesta versão

- Abre o **PDF real** com PDF.js.
- PDFs normais passam a **PDF editável RJP** ao guardar.
- O PDF guardado inclui internamente:
  - o PDF base original (`rjp-base.pdf`);
  - os dados de edição (`rjp-editable.json`).
- Ao voltar a abrir **esse mesmo PDF** na WebApp, as alterações anteriores são recuperadas e podem ser novamente editadas.
- Um Word `.docx` pode ser aberto, editado e guardado como PDF. O conteúdo editável do Word fica guardado dentro do PDF; ao reabrir o PDF na app, volta ao editor editável.
- Password por ficheiro passa a ser guardada nos metadados de projeto do próprio PDF (hash PBKDF2, não password em texto simples).
- **Correção do PDF em branco:** antes do download a app valida visualmente o PDF gerado. Se a cópia vetorial ficar vazia/incompatível, reconstrói automaticamente as páginas em modo compatibilidade e só depois descarrega.
- `Guardar` e `Guardar como...`.
- Ditado pt-PT no browser e compatibilidade com microfone do Gboard nos campos de texto.

## Nota importante

Um PDF normal não guarda parágrafos como um Word. Nos PDFs que não foram criados por esta app, a alteração de texto é feita visualmente (cobre o texto original e escreve o novo). Depois do primeiro Guardar, a WebApp passa a conservar essas alterações dentro do próprio PDF para reedição futura.

## GitHub Pages

O workflow está em `.github/workflows/webapp.yml` e usa Node.js 22.

Em **Settings → Pages**, selecionar **GitHub Actions**.
