# RJP PDF Editor V4.2.2 — Web + Android

Versão universal do editor PDF com um único workflow GitHub Actions.

## GitHub Actions
Existe apenas:

`.github/workflows/build.yml`

Esse workflow:
- compila e publica a WebApp no GitHub Pages;
- compila o APK Android;
- usa Node 22 e Java 21;
- não usa `cache: npm`, evitando o erro `Some specified paths were not resolved, unable to cache dependencies`.

## APK
Depois de um build com sucesso:
**Actions → RJP PDF Editor - Web + Android → Artifacts → RJP-PDF-Editor-Android-v4.2.2**

## Importante ao atualizar um repositório antigo
Apaga os workflows antigos dentro de `.github/workflows/` e deixa apenas `build.yml`.
