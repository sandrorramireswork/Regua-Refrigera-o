# Painel prioritário e gráficos de tendências

## Objetivo
Reorganizar o painel para que o alerta Sniper seja sempre o primeiro aviso visível e acrescentar gráficos baseados exclusivamente no histórico real de giros.

## Alterações
- Colocar o aviso Sniper acima do aviso dos padrões P1–P35, com seis linhas bem separadas e hierarquia neon mais forte.
- Manter o aviso Sniper visível apenas quando houver disparo confirmado; abaixo dele, mostrar o padrão comum ativo ou a leitura rápida da mesa.
- Criar uma aba “Tendências” no painel principal.
- Exibir um gráfico dos 35 padrões com evolução da taxa real de wins em pontos cronológicos do histórico.
- Permitir selecionar padrões no gráfico para evitar poluição visual, destacando inicialmente os mais relevantes.
- Exibir gráficos do Camuflado com a evolução real de frequência da zona, Z-Score e Kelly ao longo dos giros.
- Incluir estados claros para histórico insuficiente e manter a leitura adequada em celular e PC.

## Detalhes técnicos
- Calcular séries históricas em janelas progressivas do histórico atual, sem criar dados artificiais.
- Reaproveitar `calcDesempenhoPadrao` para as porcentagens dos padrões e `calcSniper` para Z-Score, Kelly e zona.
- Usar os componentes responsivos do Recharts já instalados no projeto.
- Manter a planilha ao vivo ou o teclado selecionado como única fonte dos gráficos.

## Validação
- Conferir compilação sem erros.
- Verificar visualmente o painel em largura móvel e desktop.
- Confirmar que o Sniper aparece antes dos padrões e que os gráficos refletem os giros reais.
