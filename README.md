# RJP PDF Editor V4.2 — WebApp + Android APK

Editor universal de PDF. Abre PDFs sem modelo pré-carregado, permite criar/editar campos, alterar fonte e tamanho, usar OCR configurável e guardar novamente um PDF editável.

## WebApp

O workflow `.github/workflows/webapp.yml` publica a pasta `dist` no GitHub Pages.

## Android APK

O workflow `.github/workflows/android.yml` cria automaticamente um projeto Android com Capacitor e compila um APK instalável de depuração.

### Como gerar o APK no GitHub

1. Carrega todo o conteúdo deste ZIP na raiz do repositório.
2. Abre **Actions → Android APK**.
3. Escolhe **Run workflow** (ou faz push para `main`).
4. Quando terminar, abre a execução e descarrega o artifact **RJP-PDF-Editor-Android-v4.2**.
5. Dentro do artifact está `RJP-PDF-Editor-v4.2-debug.apk`.

O APK usa o mesmo código da WebApp. O identificador Android é `pt.rjp.pdfeditor`.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Para sincronizar um projeto Android já existente localmente:

```bash
npm run android:sync
```
