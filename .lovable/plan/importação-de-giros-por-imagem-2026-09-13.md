# Importação de giros por imagem

## Objetivo
Trazer do projeto **Bac Bo Pro** o fluxo de leitura de registros por imagem e adaptá-lo para a Roleta Pro, reconhecendo apenas números válidos de roleta (0–36).

## O que será construído
- Nova tela protegida **Importar imagem**, acessível pelo histórico de giros e pelo painel.
- Envio por arquivo ou arrastar e soltar, aceitando JPG, PNG e WebP até 8 MB.
- Leitura automática dos números na ordem visual/cronológica da imagem.
- Conferência antes de gravar: cada número poderá ser corrigido ou removido.
- Botão para salvar todos os giros confirmados na conta conectada.
- Após salvar, painel, padrões, tendências, bankroll e histórico serão atualizados pelos mesmos giros reais.
- Mensagens claras para imagem inválida, nenhum número reconhecido ou falha de leitura.

## Detalhes técnicos
- Adaptar a leitura visual do Bac Bo Pro para saída estruturada com números inteiros de 0 a 36, preservando repetições e limitando a quantidade por imagem.
- Proteger a leitura e a gravação com a sessão do colaborador.
- Classificar cada giro ao salvar usando as regras atuais de cor, dúzia, coluna e setor.
- Gravar em lote na tabela de giros com a origem identificada como importação por imagem.
- Manter isolados os giros de cada colaborador pelas regras de acesso existentes.
- Adicionar metadados próprios à nova tela e validar em celular e computador.
