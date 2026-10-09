# Painel lateral de Monitoramento de Máximas

## Objetivo
Adicionar ao Dashboard Principal um painel direito de alta legibilidade, adjacente ao Grid de Notificações, mostrando em tempo real os atrasos de dúzias, colunas, zero, terminais e setores.

## Implementação
- Criar um motor determinístico que percorre o histórico em ordem cronológica e recalcula os atrasos a cada alteração dos giros.
- Usar exatamente as regras informadas: zero incrementa todas as dúzias/colunas, cada terminal reinicia quando aparece, e os setores seguem o mapa europeu fornecido.
- Criar o painel “Monitoramento de Máximas (Atrasos)” com quatro blocos colapsáveis: Dúzias e Colunas, Zero, Terminais e Setores.
- Posicionar o painel ao lado do Grid de Notificações em telas maiores e abaixo dele em telas menores, sem comprometer o teclado e o registro ao vivo.
- Ligar o painel diretamente ao histórico compartilhado, cobrindo entradas manuais, OCR e atualizações públicas em tempo real.

## Detalhes técnicos
- O histórico atual mantém o giro mais recente no índice zero; o cálculo será executado do giro mais antigo ao mais recente para reproduzir corretamente os contadores incrementais.
- O estado será derivado com memoização, evitando um segundo estado global mutável e mantendo os números consistentes após desfazer, limpar ou receber lotes.
- Serão adicionados testes determinísticos do motor e validação visual em celular e computador.
