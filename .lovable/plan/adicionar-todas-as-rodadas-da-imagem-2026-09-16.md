# Adicionar todas as rodadas da imagem

## Objetivo
Garantir que a leitura por imagem reconheça e envie o conjunto completo de resultados visíveis, sem parar no limite atual de 120 rodadas.

## Alterações
- Remover o limite de 120 resultados da resposta de leitura.
- Manter a ordem já definida: última linha primeiro, da direita para a esquerda, subindo até a primeira linha.
- Manter a conferência e o botão atual adicionando todo o lote reconhecido de uma só vez.
- Validar uma lista com mais de 120 rodadas e confirmar que todas entram no painel.
