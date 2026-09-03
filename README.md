# RJP PDF Editor V1.1 - Campos por linha

Correção da Ficha de Atendimento para as zonas de Observações e restantes áreas pautadas.

## Alteração principal
As antigas caixas de texto grandes deixam de ser uma única textarea. A WebApp apresenta uma caixa de edição independente sobre cada linha impressa. No primeiro Guardar, o PDF é migrado automaticamente: o campo multilinha antigo é removido e são criados campos AcroForm individuais para cada linha.

Isto permite:
- escrever exatamente sobre cada linha;
- manter o texto alinhado;
- guardar e voltar a abrir o mesmo PDF;
- continuar a editar linha a linha;
- usar Guardar e Guardar como;
- usar ditado do navegador/Gboard.

## GitHub Pages
O workflow continua em `.github/workflows/webapp.yml` e usa Node 22.

## Word
A edição genérica de Word fica separada desta correção. Em GitHub Pages, `.docx` pode ser aberto no browser com conversão HTML; o antigo `.doc` binário não tem conversão fiável 100% client-side. Para a ficha fornecida, o PDF-base já está integrado e não depende do Word depois de criada a ficha.
