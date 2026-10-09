# Rastreamento de oportunidades em 15 giros

## Objetivo
Adicionar ao painel um motor determinístico para Puxadas e Terminais que valide uma ocorrência vencedora antes de liberar o alerta seguinte, acompanhe resultados em até duas entradas e mostre oportunidades em laranja neon.

## Implementação
- Criar um módulo de regras com os nove gatilhos e seus alvos exatos, incluindo o alvo duplo do 11 e os terminais derivados do número sorteado.
- Analisar o histórico em ordem cronológica usando somente as 15 rodadas anteriores a cada novo gatilho.
- Considerar uma ocorrência anterior validada quando um alvo tiver saído em uma das duas rodadas seguintes; somente então liberar o alerta da nova ocorrência dentro da janela.
- Avaliar cada alerta após até duas entradas: Win se qualquer alvo aparecer na primeira ou segunda rodada seguinte; Loss após a segunda rodada sem alvo; alertas ainda aguardando resultado não entram no total concluído.
- Calcular assertividade por padrão como `Wins / alertas concluídos × 100`, preservando a precisão interna e arredondando apenas o texto exibido.
- Integrar o alerta do giro atual ao sistema sonoro e às notificações já existentes, com deduplicação por giro e tipo de padrão.
- Adicionar um card por oportunidade atual ao Grid de Notificações, com título, tipo, números-alvo, aviso de duas entradas e assertividade.
- Criar tokens semânticos de laranja neon no tema global e usá-los no card, sem cores diretas no componente.

## Validação
- Testar puxada simples, puxada dupla, terminal, janela expirada, primeira ocorrência sem alerta, Win na primeira/segunda entrada e Loss.
- Conferir o painel em celular e computador, incluindo alertas simultâneos sem sobreposição.
