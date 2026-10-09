# Expansão do rastreamento e grid animado

## Objetivo
Expandir o rastreamento atual para três padrões, incluindo quebras de dúzias e colunas, e apresentar alertas dinâmicos em um grid laranja neon.

## Implementação
- Manter os gatilhos e alvos exatos do Padrão A e a regra dos terminais do Padrão B.
- Adicionar o Padrão C: detectar três resultados consecutivos na mesma dúzia ou coluna e gerar como alvo todos os números das outras duas faixas, mais o zero.
- Disparar A/B somente após uma ocorrência vencedora anterior dentro das últimas 15 rodadas; disparar C imediatamente na terceira repetição.
- Avaliar cada alerta por até duas rodadas e manter Win, Loss e assertividade separados por gatilho/terminal/dúzia/coluna.
- Atualizar notificações sonoras e do aparelho com nome do padrão, alvos e assertividade individual.
- Reformular os cards em um grid animado com entrada lateral, fade, borda pulsante, fundo translúcido e destaques em laranja neon usando tokens do tema.

## Validação
- Testar A, B, quebra de dúzia, quebra de coluna, zero interrompendo sequências, Win na entrada principal/G1 e Loss.
- Conferir alertas simultâneos e legibilidade sem transbordamento no celular e computador.
