# RJP PDF Editor V0.1

Webapp React/Vite para abrir PDFs localmente, associar uma password por ficheiro, adicionar texto e exportar uma cópia editada.

## Executar
```bash
npm install
npm run dev
```

## Build
```bash
npm install
npm run build
```

### Nota de segurança
Nesta V0.1 a password é associada ao ficheiro dentro da aplicação/browser (hash SHA-256 no armazenamento local). Ela **não encripta ainda o PDF exportado**. Para proteção PDF AES real será necessário acrescentar um motor/serviço compatível com encriptação PDF.

## GitHub Actions
Inclui `.github/workflows/build.yml`. Em cada push para `main`/`master`, o GitHub instala Node.js 22, executa `npm install` e `npm run build`, e disponibiliza a pasta `dist` como artifact.
