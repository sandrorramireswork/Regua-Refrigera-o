# Motor Balístico e Previsão de Zonas

## Objetivo
Adicionar ao painel principal uma análise balística por rodada, mantendo como regra imutável do ponto de impacto a menor diferença absoluta entre a Zona Alvo projetada e o ângulo estático de cada número.

## Construção
- Criar o motor matemático isolado com a ordem europeia informada, ângulos estáticos a partir do zero e passo de `360/37`.
- Projetar a Zona Alvo com coeficientes de desaceleração ajustáveis, sem interferir na regra central de impacto.
- Definir o Ponto de Impacto Primário exclusivamente por `abs(Zona Alvo em graus - Ângulo estático do número)`, escolhendo o menor resultado.
- Calcular o Número Provável avançando de 9 a 15 casas na ordem do rotor.
- Oferecer modo automático de dispersão, baseado na estabilidade recente, e modo manual ajustável por rodada.
- Calcular confiança pela consistência dos deltas das três últimas rodadas, com estado insuficiente antes disso.

## Interface
- Adicionar a aba “Análise Balística” ao painel.
- Incluir dois cronômetros, para bolinha e rotor, com início/parada e correção manual dos milissegundos.
- Exibir controles de calibração da desaceleração e alternância Automático/Manual da dispersão.
- Salvar localmente as análises em cada aparelho, acompanhando o modelo de acesso público atual.
- Criar tabela executiva em Dark Neon, atualizada a cada análise, com as 13 colunas na ordem solicitada e rolagem horizontal no celular.
- Derivar automaticamente Terminal, Dúzia, Coluna, Metade e Cor do Número Provável.

## Notificações
- Quando a confiança superar 80%, mostrar um card prioritário pulsante “Análise Validada” no Grid de Notificações principal.
- Listar Número Provável, Dúzia, Coluna, Metade e Cor no alerta visual.
- Disparar também o aviso já usado pelo aplicativo, uma única vez por análise validada.

## Validação
- Testar a regra de impacto, limites de dispersão, propriedades do zero e cálculo de confiança.
- Conferir compilação e funcionamento do fluxo completo.
- Validar a tabela, cronômetros e alerta no celular e no computador.
