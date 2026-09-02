# RJP PDF Editor — WebApp

WebApp para abrir um PDF localmente no browser, associar uma password ao ficheiro no dispositivo, adicionar texto e exportar um novo PDF.

## Publicação automática no GitHub Pages

O workflow `.github/workflows/webapp.yml` faz automaticamente:

1. checkout do repositório;
2. instalação com Node.js 22;
3. `npm run build`;
4. upload da pasta `dist`;
5. publicação no GitHub Pages.

### Primeira configuração no GitHub

No repositório `RJP-PDF-Editor` abre:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

Depois executa o workflow em **Actions → RJP PDF Editor - WebApp → Run workflow**, ou faz um novo push para `main`.

A aplicação ficará normalmente disponível em:

`https://ruijpedro.github.io/RJP-PDF-Editor/`

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
