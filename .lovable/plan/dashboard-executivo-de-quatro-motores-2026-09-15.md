# Dashboard Executivo de Quatro Motores

## Objetivo
Unificar quatro motores estatísticos em tempo real, preservando integralmente a ordem europeia e as fórmulas de Z-Score e Kelly, sem arredondamentos nos cálculos internos.

## Construção
- Criar um núcleo quantitativo isolado para processar, em paralelo, tendências de 20 e 50 giros, geometria física da roda, transições históricas de primeira ordem e densidade direcional.
- Usar a ordem europeia exata já adotada pelo aplicativo como referência única para Zona 5, distância física e Distância Relativa do Zero.
- Calcular Z-Score por `Z = (X - μ) / σ`, mantendo precisão integral e limitando apenas a apresentação visual entre -3 e +3.
- Calcular Kelly por `f = (bp - q) / b`, com `b = 36`, sem Kelly fracionário e sem arredondamento interno.
- Detectar retenção quando pelo menos 3 dos últimos 4 giros couberem em uma janela circular total de 9 casas, escolhendo o núcleo de maior cobertura.

## Interface
- Evoluir “Top 10 Puxa” para a tabela mestra com as oito colunas solicitadas, baseada no último número e em suas sucessões reais.
- Destacar confluências dominantes de dúzia, coluna, cor e paridade; exibir setor, Z-Score, DRZ, Zona 5 e Kelly.
- Adicionar resumo executivo dos quatro motores e gráfico direcional da retenção de setor em Dark Mode neon.
- Manter rolagem horizontal da tabela em telas pequenas e atualização instantânea após cada giro local.

## Alertas
- Mostrar “⚠️ ALERTA: Retenção de Setor Ativa” com núcleo e Zona 5 quando a regra 3 de 4 for satisfeita.
- Acender em neon verde cada linha que reunir Z-Score maior que 1,5, pertencimento à retenção e Kelly positiva.
- Disparar “ENTRADA DE ALTA PRECISÃO” uma vez por giro e candidato qualificado no Grid principal e no aviso do aparelho.

## Validação
- Testar ordem física, Zona 5, DRZ, Z-Score, Kelly com `b=36`, transições e retenção circular com casos determinísticos.
- Validar atualização por novo giro, tabela, gráfico e alertas no celular e computador.