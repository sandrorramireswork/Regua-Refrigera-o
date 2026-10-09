# Aba de rodadas por imagem

## Objetivo
Adicionar ao painel principal uma aba pública para receber uma imagem com resultados de roleta, reconhecer os números e inseri-los no fluxo de giros ao vivo.

## O que será alterado
- Criar a aba **Rodadas por Imagem** no painel principal.
- Permitir escolher ou arrastar imagens JPG, PNG e WebP, com prévia antes da leitura.
- Ler primeiro a linha superior que estiver fora dos quadros e, depois, percorrer cada linha de cima para baixo, sempre da esquerda para a direita.
- Exibir os números reconhecidos na mesma ordem visual para conferência, correção e exclusão.
- Adicionar todos os números confirmados ao histórico público e atualizar imediatamente os motores, gráficos e alertas do painel.
- Manter a leitura disponível pelo link público, sem exigir cadastro.

## Detalhes técnicos
- Ajustar a instrução de reconhecimento para ignorar molduras como critério de ordem e priorizar explicitamente a primeira linha superior externa.
- Remover a exigência de sessão apenas da leitura de imagem, mantendo validação de formato, tamanho e números entre 0 e 36.
- Reutilizar o registro público de giros já existente, preservando a ordem cronológica reconhecida ao inserir o lote.
- Validar a nova aba em celular e computador e confirmar que os alertas recebem os giros importados.
