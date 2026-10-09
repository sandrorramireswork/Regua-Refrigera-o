# Saltos físicos e Super Confluência

## Objetivo
Adicionar ao painel o rastreador da assinatura física dos saltos e um Super Sinal quando dois ou mais padrões simultâneos apontarem para os mesmos números.

## Motor de saltos
- Reutilizar a ordem europeia central do projeto, preservando-a exatamente e sem duplicar constantes.
- Calcular cada salto no sentido horário pela diferença circular entre o índice anterior e o atual.
- Considerar os quatro saltos mais recentes concentrados quando a diferença entre o maior e o menor for de até cinco casas.
- Calcular a média com precisão total e arredondar somente a projeção final para a casa mais próxima.
- Projetar a partir do último número e gerar uma Zona 5: alvo central mais dois vizinhos físicos de cada lado.
- Avaliar cada alerta em até duas entradas, mantendo Win, Loss e assertividade própria do Padrão D.

## Motor de confluência
- Cruzar, na mesma rodada, os sinais ativos de Puxada, Terminal, Quebra de Dúzia, Quebra de Coluna e Salto.
- Exigir pelo menos dois tipos diferentes de padrão; repetir o mesmo tipo não conta como confluência adicional.
- Retornar somente números presentes em alvos de pelo menos dois padrões, identificando quais padrões sustentam cada número.
- Avaliar o Super Sinal em até duas entradas, com estatística própria e deduplicação por giro.

## Interface e notificações
- Manter alertas comuns em laranja.
- Mostrar Saltos Físicos e Super Confluência em cards ciano neon com entrada por zoom/fade e borda pulsante.
- Exibir no Super Sinal: título exato, padrões cruzados, números interseccionados, badge “MÁXIMA ASSERTIVIDADE” e “Proteção G1 (Até 2 entradas)”.
- Enviar som/notificação uma única vez por sinal e giro.

## Validação
- Testar distância circular, quatro saltos dentro e fora da amplitude, arredondamento da projeção e Zona 5.
- Testar interseções com dois ou mais padrões e ausência de sinal sem números duplicados.
- Testar Win/Loss em duas entradas e conferir o layout em celular e computador.
