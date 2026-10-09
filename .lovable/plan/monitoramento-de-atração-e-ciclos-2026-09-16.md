# Monitoramento de Atração e Ciclos

## Objetivo
Adicionar ao painel principal uma aba analítica dark-mode para acompanhar relações de atração, ciclos médios e alertas instantâneos.

## Alterações
- Criar a aba “Monitoramento de Atração e Ciclos” no seletor atual do dashboard.
- Exibir em Chart.js um gráfico horizontal com os quatro pares fixos: 7→21 (66,6%), 9→25 (40,0%), 26→33 (40,0%) e 34→35 (40,0%).
- Criar a tabela de Repressão e Retorno para 34, 35, 32, 15, 25 e 21 com os ciclos médios informados.
- Adicionar um card fixo de Síntese Estratégica sobre zonas de alta densidade e quebra de assimetria, sem inventar métricas adicionais.
- Reaproveitar o teclado e o histórico público já existentes como entrada sequencial em tempo real, mantendo a aba sincronizada entre aparelhos abertos pelo link.
- Detectar os gatilhos 7, 9, 26, 34, 22 e 18 a cada novo giro.
- Para 7, 9, 26 e 34, usar os alvos e percentuais fixos fornecidos.
- Para 22 e 18, calcular ao vivo o alvo mais frequente após o gatilho e sua probabilidade com base no histórico real; quando ainda não houver sucessão observada, indicar “alvo em observação”.
- Mostrar um painel lateral piscante “Padrão Aproximado” com gatilho, alvo e chance, além de som, vibração e notificação deduplicada por giro.

## Detalhes técnicos
- Usar Chart.js com integração React, carregada de forma compatível com a renderização do aplicativo.
- Manter os giros em ordem do mais recente para o mais antigo e calcular transições cronologicamente.
- Não arredondar cálculos internos; formatar percentuais somente na interface.
- Preservar os tokens neon, a navegação por abas e a adaptação atual para celular e computador.

## Validação
- Conferir compilação sem erros.
- Verificar gatilhos fixos e dinâmicos com sequências controladas.
- Validar visualmente a aba e o alerta em celular e computador.
- Confirmar recebimento por atualização pública sem login.
