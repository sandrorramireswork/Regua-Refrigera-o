# Radar de Densidade e Smart Bankroll

## Objetivo
Adicionar leitura de concentração física nas últimas 50 rodadas e uma proteção financeira que sugere entradas e interrompe novos alertas ao atingir a meta ou o limite.

## Padrão F — Radar de Densidade
- Dividir os 36 números não-zero em quatro quadrantes fixos de nove casas adjacentes, seguindo exatamente a ordem europeia central; o zero fica separado.
- Calcular continuamente quantidade e percentual de cada quadrante sobre os resultados não-zero da janela de até 50 rodadas, registrando também a quantidade de zeros.
- Marcar como Zona Quente todo quadrante acima de 40% e emitir alerta de tendência deduplicado por giro.
- Exibir um painel compacto com distribuição dos quatro quadrantes e destaque vermelho neon nas zonas quentes.

## Recurso G — Smart Bankroll
- Adicionar no topo do painel os campos Banca Atual, Meta Diária e Limite de Perda, com validação numérica, limites seguros e persistência neste aparelho.
- Sugerir 1% da banca para alertas laranja e 2,5% para Super Confluência, como valor total dividido igualmente entre os números-alvo.
- Simular cada alerta concluído em até duas entradas: cada entrada distribui o valor sugerido entre os alvos; acerto paga 35:1 no número vencedor e perdas descontam o total apostado.
- Evitar dupla contabilização de um mesmo alerta e mostrar saldo simulado e valor sugerido nos cards.

## Lockdown
- Ativar Stop-Win quando o lucro simulado atingir a Meta Diária e Stop-Loss quando atingir o limite de perda.
- Bloquear novos alertas e novas apostas simuladas enquanto o Lockdown estiver ativo, sem apagar histórico ou impedir o registro de rodadas.
- Mostrar overlay não dispensável verde para meta batida ou vermelho para stop-loss, com as mensagens exatas solicitadas.

## Validação
- Testar quadrantes, exclusão do zero e gatilho acima de 40%.
- Testar divisão da entrada, pagamento 35:1, Win/Loss em duas entradas, percentuais de 1% e 2,5% e ambos os limites.
- Conferir painel, sugestões e overlays em celular e computador.
