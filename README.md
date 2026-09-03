# RJP PDF Editor V1.8 — edição permanente

Base reconstruída a partir da WebApp da Ficha de Atendimento Patrícia.

## O que mudou
- A ficha deixou de estar embutida na aplicação.
- Abre PDFs reais por botão ou drag & drop.
- Mantém o PDF aberto durante toda a sessão.
- Clicar em texto existente cria uma edição visual no mesmo local.
- Adiciona texto e marcas ✓.
- Campos criados podem ser movidos e redimensionados.
- AutoSave da sessão em IndexedDB e restauro após refresh.
- Guardar grava as alterações no PDF e mantém o resultado aberto para continuar a editar.
- Ctrl+S guarda; Ctrl+Z desfaz; Delete apaga o campo selecionado.

## Nota técnica
A edição de texto estático de PDF é feita de forma não destrutiva: a zona original é coberta e o texto novo é desenhado por cima. Isto evita reconstruir/rasterizar páginas e reduz o risco de PDFs em branco.
