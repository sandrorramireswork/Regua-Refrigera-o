/**
 * Motor de Decisão Analítica (Decision Engine) para Roleta
 * 
 * Funcionalidades Principais:
 * 1. Análise estrita da janela deslizante das últimas 30 rodadas (Hit Rate de padrões e grupos).
 * 2. Classificação determinística em 3 Estados Dinâmicos:
 *    - ESTADO 1: Alavancagem Máxima (Hit Rate Alto / Intersecção Forte Dúzia + Coluna)
 *    - ESTADO 2: Cobertura/Conservador (Hit Rate Médio / Tendência 2/3 da mesa)
 *    - ESTADO 3: Risco Elevado (Hit Rate Baixo / Mercado Caótico / Sem Padrão)
 * 3. Geração de Curva Térmica (Sparkline) para Chart.js.
 * 4. Cálculo matemático do Gauge de Confiança (0 a 100%).
 * 5. Integração com o motor de gestão operacional (Smart Buttons Green/Red e telemetria de ROI).
 */

import type { Spin, Padrao } from "./roulette";
import {
  calcDesempenhoPadrao,
  PADROES_PADRAO,
  REDS,
} from "./roulette";
import {
  loadSessaoOperacional,
  saveSessaoOperacional,
  EVENT_OPERACIONAL_CHANGE,
  loadGestaoOperacionalConfig,
  type SessaoFinanceiraOperacional,
} from "./gestao-operacional-engine";
import { supabase } from "@/integrations/supabase/client";

export type EstadoDecisao = 1 | 2 | 3;

export type CodigoEstadoDecisao =
  | "ESTADO_1_ALAVANCAGEM"
  | "ESTADO_2_CONSERVADOR"
  | "ESTADO_3_RISCO";

export interface ThermalDataPoint {
  roundIndex: number;
  label: string;
  spinNum: number;
  isHit: boolean;
  cumulativeHitRate: number; // 0 a 100%
  rollingIntensity: number;  // 0 a 100% (média móvel 5 giros)
}

export interface DecisionEngineResult {
  estado: EstadoDecisao;
  codigoEstado: CodigoEstadoDecisao;
  badge: string;
  mensagem: string;
  subtitulo: string;
  confiancaPerc: number;     // 0 a 100%
  hitRate30: number;         // 0 a 100%
  totalRodadasJanela: number;// até 30
  
  // Detalhes da recomendação
  duziaRecomendada: number | null; // 1, 2 ou 3
  colunaRecomendada: number | null; // 1, 2 ou 3
  duziasCobertura: number[];       // Ex: [1, 2]
  colunasCobertura: number[];      // Ex: [2, 3]
  alvosNumeros: number[];          // Números em destaque para aposta
  numerosIntersecao: number[];     // No Estado 1: 4 números da interseção
  
  // Estatísticas de suporte na janela de 30
  estatisticasGrupos: {
    duzia1Perc: number;
    duzia2Perc: number;
    duzia3Perc: number;
    coluna1Perc: number;
    coluna2Perc: number;
    coluna3Perc: number;
    duziaDominante: number;
    colunaDominante: number;
    coberturaDoisTercosPerc: number;
    tipoDoisTercos: "duzias" | "colunas";
  };

  // Curva térmica para mini-gráfico Chart.js (Estados 1 e 2)
  curvaTermica: ThermalDataPoint[];
  labelsCurva: string[];
  valoresCurva: number[];

  // Justificativa analítica detalhada
  justificativa: string;
  tempoSinal: string;
}

export interface DecisionHistoryRecord {
  id: string;
  timestamp: string;
  estado: EstadoDecisao;
  mensagem: string;
  resultado: "GREEN" | "RED";
  aposta: number;
  lucroLiquido: number;
  roiMomento: number;
  confiancaPerc: number;
}

export const STORAGE_KEY_DECISION_HISTORY = "neon_decision_engine_history_v1";

/**
 * Retorna os números de uma dúzia específica (1: 1-12, 2: 13-24, 3: 25-36)
 */
export function getNumerosDuzia(d: number): number[] {
  if (d === 1) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (d === 2) return [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  if (d === 3) return [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
  return [];
}

/**
 * Retorna os números de uma coluna específica
 */
export function getNumerosColuna(c: number): number[] {
  const nums: number[] = [];
  const rem = c === 3 ? 0 : c;
  for (let i = 1; i <= 36; i++) {
    if (i % 3 === rem) nums.push(i);
  }
  return nums;
}

/**
 * Analisa estritamente a janela das últimas 30 rodadas e calcula o Motor de Decisão Analítica
 */
export function analyzeDecisionEngine(
  spins: Spin[],
  padroes: Padrao[] = PADROES_PADRAO
): DecisionEngineResult {
  // 1. FILTRAR ESTRITAMENTE A JANELA DAS ÚLTIMAS 30 RODADAS
  // spins[0] é o giro mais recente, spins[29] é o 30º mais recente
  const janela30 = spins.slice(0, 30);
  const totalRodadasJanela = janela30.length;

  // Estado padrão para histórico insuficiente (< 5 giros)
  if (totalRodadasJanela < 5) {
    return {
      estado: 3,
      codigoEstado: "ESTADO_3_RISCO",
      badge: "COLETA DE DADOS",
      mensagem: "🚫 Aguardando melhor oportunidade.",
      subtitulo: `Coletando amostra (${totalRodadasJanela}/30 rodadas registradas)`,
      confiancaPerc: 15,
      hitRate30: 0,
      totalRodadasJanela,
      duziaRecomendada: null,
      colunaRecomendada: null,
      duziasCobertura: [],
      colunasCobertura: [],
      alvosNumeros: [],
      numerosIntersecao: [],
      estatisticasGrupos: {
        duzia1Perc: 0,
        duzia2Perc: 0,
        duzia3Perc: 0,
        coluna1Perc: 0,
        coluna2Perc: 0,
        coluna3Perc: 0,
        duziaDominante: 1,
        colunaDominante: 1,
        coberturaDoisTercosPerc: 0,
        tipoDoisTercos: "duzias",
      },
      curvaTermica: [],
      labelsCurva: [],
      valoresCurva: [],
      justificativa: "Amostra insuficiente na janela de 30 giros. O motor aguarda no mínimo 5 giros para iniciar a filtragem analítica.",
      tempoSinal: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  }

  // 2. CÁLCULO DO HIT RATE DOS PADRÕES ATUAIS NA JANELA DE 30 RODADAS
  const padroesAtivos = padroes.filter((p) => p.ativa);
  let totalOcorrenciasPadroes = 0;
  let totalWinsPadroes = 0;
  let maxHitRatePadrao = 0;

  for (const padrao of padroesAtivos) {
    const desp = calcDesempenhoPadrao(janela30, padrao);
    if (desp.total > 0) {
      totalOcorrenciasPadroes += desp.total;
      totalWinsPadroes += desp.winsAte2;
      if (desp.percAte2 > maxHitRatePadrao) {
        maxHitRatePadrao = desp.percAte2;
      }
    }
  }

  const hitRatePadroesGeral =
    totalOcorrenciasPadroes > 0
      ? (totalWinsPadroes / totalOcorrenciasPadroes) * 100
      : maxHitRatePadrao > 0
      ? maxHitRatePadrao
      : 35.0; // fallback base se nenhum padrão específico tiver gatilho no período

  // 3. ANÁLISE DE FREQUÊNCIA DE DÚZIAS E COLUNAS NA JANELA DE 30
  const girosValidos = janela30.filter((s) => s.num !== 0);
  const totalValidos = girosValidos.length || 1;

  const countD1 = girosValidos.filter((s) => s.props.duzia === 1).length;
  const countD2 = girosValidos.filter((s) => s.props.duzia === 2).length;
  const countD3 = girosValidos.filter((s) => s.props.duzia === 3).length;

  const countC1 = girosValidos.filter((s) => s.props.coluna === 1).length;
  const countC2 = girosValidos.filter((s) => s.props.coluna === 2).length;
  const countC3 = girosValidos.filter((s) => s.props.coluna === 3).length;

  const percD1 = (countD1 / totalValidos) * 100;
  const percD2 = (countD2 / totalValidos) * 100;
  const percD3 = (countD3 / totalValidos) * 100;

  const percC1 = (countC1 / totalValidos) * 100;
  const percC2 = (countC2 / totalValidos) * 100;
  const percC3 = (countC3 / totalValidos) * 100;

  // Dúzia e Coluna Dominantes (Rank 1)
  const rankingDuzias = [
    { idx: 1, perc: percD1, count: countD1 },
    { idx: 2, perc: percD2, count: countD2 },
    { idx: 3, perc: percD3, count: countD3 },
  ].sort((a, b) => b.perc - a.perc);

  const rankingColunas = [
    { idx: 1, perc: percC1, count: countC1 },
    { idx: 2, perc: percC2, count: countC2 },
    { idx: 3, perc: percC3, count: countC3 },
  ].sort((a, b) => b.perc - a.perc);

  const duziaDominante = rankingDuzias[0]!.idx;
  const percDuziaDom = rankingDuzias[0]!.perc;

  const colunaDominante = rankingColunas[0]!.idx;
  const percColunaDom = rankingColunas[0]!.perc;

  // 4. ANÁLISE DE INTERSECÇÃO (Dúzia Dominante + Coluna Dominante)
  const numsDuziaDom = getNumerosDuzia(duziaDominante);
  const numsColunaDom = getNumerosColuna(colunaDominante);
  const numerosIntersecao = numsDuziaDom.filter((n) => numsColunaDom.includes(n)); // 4 números

  // Contagem de saídas da interseção na janela
  const setIntersecao = new Set(numerosIntersecao);
  const countIntersecao = janela30.filter((s) => setIntersecao.has(s.num)).length;
  const percIntersecao = (countIntersecao / totalRodadasJanela) * 100;
  // Frequência teórica uniforme de 4 números é (4/37) = ~10.81%
  const isIntersecaoAlta = percIntersecao >= 16.0 || (percDuziaDom >= 40.0 && percColunaDom >= 38.0);

  // 5. ANÁLISE DE DOIS TERÇOS DA MESA (Cobertura de 2 Dúzias ou 2 Colunas)
  const top2DuziasPerc = rankingDuzias[0]!.perc + rankingDuzias[1]!.perc;
  const top2ColunasPerc = rankingColunas[0]!.perc + rankingColunas[1]!.perc;

  const favoreceDuzias = top2DuziasPerc >= top2ColunasPerc;
  const coberturaDoisTercosPerc = favoreceDuzias ? top2DuziasPerc : top2ColunasPerc;
  const tipoDoisTercos: "duzias" | "colunas" = favoreceDuzias ? "duzias" : "colunas";

  const duziasCobertura = [rankingDuzias[0]!.idx, rankingDuzias[1]!.idx].sort();
  const colunasCobertura = [rankingColunas[0]!.idx, rankingColunas[1]!.idx].sort();

  // Cobertura teórica uniforme de 2 terços é (24/37) = ~64.86%
  const isTendenciaDoisTercos = coberturaDoisTercosPerc >= 68.0;

  // 6. CLASSIFICAÇÃO DOS 3 ESTADOS
  let estado: EstadoDecisao = 3;
  let codigoEstado: CodigoEstadoDecisao = "ESTADO_3_RISCO";
  let mensagem = "🚫 Aguardando melhor oportunidade.";
  let subtitulo = "Hit Rate baixo ou mercado caótico nas últimas rodadas.";
  let badge = "RISCO ELEVADO";
  let confiancaPerc = 30;
  let alvosNumeros: number[] = [];

  // Hit Rate Composto (Ponderando o Hit Rate de Padrões e a Aderência Estatística)
  const hitRate30 = Math.round(
    Math.max(
      hitRatePadroesGeral,
      (percDuziaDom * 0.5 + percColunaDom * 0.5)
    )
  );

  // CONDIÇÃO ESTADO 1: Alavancagem Máxima (Hit Rate Alto / Padrão Forte)
  // Intersecção clara e altíssima frequência entre uma Dúzia e uma Coluna específica.
  if (hitRate30 >= 58 && isIntersecaoAlta) {
    estado = 1;
    codigoEstado = "ESTADO_1_ALAVANCAGEM";
    badge = "ALAVANCAGEM MÁXIMA";
    mensagem = `🔥 JUNTAR DINHEIRO DO CHÃO! Entrada Forte: ${duziaDominante}ª Dúzia + ${colunaDominante}ª Coluna.`;
    subtitulo = `Intersecção de alta confluência nos números ${numerosIntersecao.join(", ")} com ${percIntersecao.toFixed(1)}% de densidade nas últimas ${totalRodadasJanela} rodadas.`;
    // Confiança entre 82% e 98%
    confiancaPerc = Math.min(
      98,
      Math.max(82, Math.round(hitRate30 * 0.5 + percIntersecao * 1.5 + (percDuziaDom + percColunaDom) * 0.25))
    );
    // Alvos principais: união da dúzia com a coluna, com os 4 da interseção em prioridade
    alvosNumeros = Array.from(new Set([...numerosIntersecao, ...numsDuziaDom, ...numsColunaDom]));
  }
  // CONDIÇÃO ESTADO 2: Cobertura/Conservador (Hit Rate Médio / Dispersão)
  // Sem intersecção clara, mas tendência matemática favorecendo dois terços da mesa.
  else if (hitRate30 >= 42 || isTendenciaDoisTercos) {
    estado = 2;
    codigoEstado = "ESTADO_2_CONSERVADOR";
    badge = "ENTRADA CONSERVADORA";
    
    if (favoreceDuzias) {
      mensagem = `⚠️ ENTRADA CONSERVADORA: Cobrir ${duziasCobertura[0]}ª e ${duziasCobertura[1]}ª Dúzia OU ${colunasCobertura[0]}ª e ${colunasCobertura[1]}ª Coluna.`;
      subtitulo = `Tendência matemática favorece dois terços da mesa (${coberturaDoisTercosPerc.toFixed(1)}% de frequência nas últimas ${totalRodadasJanela} rodadas).`;
      alvosNumeros = Array.from(
        new Set([...getNumerosDuzia(duziasCobertura[0]!), ...getNumerosDuzia(duziasCobertura[1]!)])
      );
    } else {
      mensagem = `⚠️ ENTRADA CONSERVADORA: Cobrir ${duziasCobertura[0]}ª e ${duziasCobertura[1]}ª Dúzia OU ${colunasCobertura[0]}ª e ${colunasCobertura[1]}ª Coluna.`;
      subtitulo = `Tendência matemática favorece dois terços da mesa (${coberturaDoisTercosPerc.toFixed(1)}% de frequência nas colunas).`;
      alvosNumeros = Array.from(
        new Set([...getNumerosColuna(colunasCobertura[0]!), ...getNumerosColuna(colunasCobertura[1]!)])
      );
    }
    // Confiança entre 52% e 79%
    confiancaPerc = Math.min(
      79,
      Math.max(52, Math.round(coberturaDoisTercosPerc * 0.75 + hitRate30 * 0.25))
    );
  }
  // CONDIÇÃO ESTADO 3: Risco Elevado (Hit Rate Baixo / Sem Padrão)
  // Percentual de acerto dos padrões caindo e mercado caótico nas últimas rodadas.
  else {
    estado = 3;
    codigoEstado = "ESTADO_3_RISCO";
    badge = "RISCO ELEVADO";
    mensagem = "🚫 Aguardando melhor oportunidade.";
    subtitulo = "Percentual de acerto dos padrões em queda e mercado disperso nas últimas 30 rodadas.";
    confiancaPerc = Math.max(12, Math.min(48, Math.round(hitRate30 * 0.65)));
    alvosNumeros = [];
  }

  // 7. GERAÇÃO DA CURVA TÉRMICA (SPARKLINE PARA CHART.JS)
  // Ordena a janela do mais antigo (30 giros atrás) para o mais recente (último giro)
  const cronologico = [...janela30].reverse();
  const alvoSet = new Set(alvosNumeros.length > 0 ? alvosNumeros : numsDuziaDom);

  let hitsAcumulados = 0;
  const curvaTermica: ThermalDataPoint[] = cronologico.map((spin, idx) => {
    const isHit = alvoSet.has(spin.num);
    if (isHit) hitsAcumulados++;
    const totalAteAqui = idx + 1;
    const cumulativeHitRate = Number(((hitsAcumulados / totalAteAqui) * 100).toFixed(1));

    // Média móvel dos últimos 5 giros até este ponto
    const startIdx = Math.max(0, idx - 4);
    const slice5 = cronologico.slice(startIdx, idx + 1);
    const hits5 = slice5.filter((s) => alvoSet.has(s.num)).length;
    const rollingIntensity = Number(((hits5 / slice5.length) * 100).toFixed(1));

    return {
      roundIndex: idx + 1,
      label: `G${idx + 1}`,
      spinNum: spin.num,
      isHit,
      cumulativeHitRate,
      rollingIntensity,
    };
  });

  const labelsCurva = curvaTermica.map((pt) => pt.label);
  const valoresCurva = curvaTermica.map((pt) => pt.cumulativeHitRate);

  const justificativa =
    estado === 1
      ? `Intersecção clara e altíssima frequência detectada entre a ${duziaDominante}ª Dúzia (${percDuziaDom.toFixed(1)}%) e a ${colunaDominante}ª Coluna (${percColunaDom.toFixed(1)}%). Os 4 números de cruzamento (${numerosIntersecao.join(", ")}) apresentam ${percIntersecao.toFixed(1)}% de densidade nas últimas 30 rodadas.`
      : estado === 2
      ? `Dispersão moderada sem intersecção dominante única. No entanto, a análise dos 2 terços da mesa aponta probabilidade estatística de ${coberturaDoisTercosPerc.toFixed(1)}% para as ${tipoDoisTercos} dominantes.`
      : `Padrões com taxa de acerto de apenas ${hitRate30}% na janela de 30 giros. O mercado apresenta alta entropia e dispersão uniforme sem agrupamento matemático consistente. Recomenda-se aguardar alinhamento de confluência.`;

  return {
    estado,
    codigoEstado,
    badge,
    mensagem,
    subtitulo,
    confiancaPerc,
    hitRate30,
    totalRodadasJanela,
    duziaRecomendada: estado === 1 ? duziaDominante : null,
    colunaRecomendada: estado === 1 ? colunaDominante : null,
    duziasCobertura,
    colunasCobertura,
    alvosNumeros,
    numerosIntersecao,
    estatisticasGrupos: {
      duzia1Perc: Number(percD1.toFixed(1)),
      duzia2Perc: Number(percD2.toFixed(1)),
      duzia3Perc: Number(percD3.toFixed(1)),
      coluna1Perc: Number(percC1.toFixed(1)),
      coluna2Perc: Number(percC2.toFixed(1)),
      coluna3Perc: Number(percC3.toFixed(1)),
      duziaDominante,
      colunaDominante,
      coberturaDoisTercosPerc: Number(coberturaDoisTercosPerc.toFixed(1)),
      tipoDoisTercos,
    },
    curvaTermica,
    labelsCurva,
    valoresCurva,
    justificativa,
    tempoSinal: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

/**
 * Registra validação manual 'Green' ou 'Red' disparada pelos Smart Buttons,
 * atualizando instantaneamente a sessão financeira, histórico e métricas de ROI sem recarregar a página.
 */
export async function registrarResultadoDecisao(
  tipoResultado: "GREEN" | "RED",
  decisao: DecisionEngineResult,
  valorApostaPersonalizado?: number
): Promise<{
  novaSessao: SessaoFinanceiraOperacional;
  lucroGiro: number;
  novoRoi: number;
  mensagem: string;
}> {
  const sessaoAtual = loadSessaoOperacional();
  const config = loadGestaoOperacionalConfig();

  // Valor da aposta base: configurado na gestão ou padrão R$ 10.00
  const valorAposta =
    valorApostaPersonalizado !== undefined && valorApostaPersonalizado > 0
      ? valorApostaPersonalizado
      : config.valorEntradaInicial > 0
      ? config.valorEntradaInicial
      : 10.0;

  let lucroLiquidoGiro = 0;

  if (tipoResultado === "GREEN") {
    // Se Estado 1 (Dúzia + Coluna): payout líquido 2:1 (ou até 4:1 na interseção plena)
    // Se Estado 2 (2 Dúzias ou 2 Colunas): cobertura 2 terços paga 0.5:1 líquido (aposta 2 un, ganha 3, lucro 1 un = +50%)
    if (decisao.estado === 1) {
      lucroLiquidoGiro = valorAposta * 2.0; // +200% de lucro
    } else if (decisao.estado === 2) {
      lucroLiquidoGiro = valorAposta * 0.5; // +50% de lucro na cobertura de 2 terços
    } else {
      lucroLiquidoGiro = valorAposta * 1.0;
    }
  } else {
    // RED: perda total da aposta
    lucroLiquidoGiro = -valorAposta;
  }

  const novoLucroLiquido = Number((sessaoAtual.lucroLiquidoSessao + lucroLiquidoGiro).toFixed(2));
  const novaBancaAtual = Number((sessaoAtual.bancaInicial + novoLucroLiquido).toFixed(2));
  const novoRoi =
    sessaoAtual.bancaInicial > 0
      ? Number(((novoLucroLiquido / sessaoAtual.bancaInicial) * 100).toFixed(2))
      : 0;

  const novaSessao: SessaoFinanceiraOperacional = {
    ...sessaoAtual,
    bancaAtual: novaBancaAtual,
    lucroLiquidoSessao: novoLucroLiquido,
    roiSessaoPerc: novoRoi,
    totalEntradasAcionadas: sessaoAtual.totalEntradasAcionadas + 1,
    totalGirosOperados: sessaoAtual.totalGirosOperados + 1,
    greensTotais: tipoResultado === "GREEN" ? sessaoAtual.greensTotais + 1 : sessaoAtual.greensTotais,
    redsTotais: tipoResultado === "RED" ? sessaoAtual.redsTotais + 1 : sessaoAtual.redsTotais,
    statusTrava: "LIVRE",
  };

  // Salva no localStorage e dispara evento para sincronizar todos os componentes da tela
  saveSessaoOperacional(novaSessao);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_OPERACIONAL_CHANGE));
  }

  // Grava no histórico do Decision Engine
  const record: DecisionHistoryRecord = {
    id: `dec-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    estado: decisao.estado,
    mensagem: decisao.mensagem,
    resultado: tipoResultado,
    aposta: valorAposta,
    lucroLiquido: lucroLiquidoGiro,
    roiMomento: novoRoi,
    confiancaPerc: decisao.confiancaPerc,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_DECISION_HISTORY);
    const existing: DecisionHistoryRecord[] = raw ? JSON.parse(raw) : [];
    existing.unshift(record);
    localStorage.setItem(STORAGE_KEY_DECISION_HISTORY, JSON.stringify(existing.slice(0, 50)));
  } catch {}

  // Sincroniza opcionalmente com Supabase se usuário estiver logado
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user?.id) {
      await supabase.from("game_entries").insert({
        user_id: auth.user.id,
        pattern_code: `DECISION_E${decisao.estado}`,
        bet: valorAposta,
        result: lucroLiquidoGiro,
        note: `Smart Button ${tipoResultado} (${decisao.badge}) · ROI: ${novoRoi}%`,
      });
    }
  } catch {}

  const retornoMsg =
    tipoResultado === "GREEN"
      ? `🟢 GREEN validado com sucesso! Lucro: +R$ ${lucroLiquidoGiro.toFixed(2)} | Novo ROI: ${novoRoi >= 0 ? "+" : ""}${novoRoi}%`
      : `🔴 RED computado. Perda: -R$ ${valorAposta.toFixed(2)} | Novo ROI: ${novoRoi >= 0 ? "+" : ""}${novoRoi}%`;

  return {
    novaSessao,
    lucroGiro: lucroLiquidoGiro,
    novoRoi,
    mensagem: retornoMsg,
  };
}

/**
 * Lê o histórico de decisões salvas localmente
 */
export function getDecisionEngineHistory(): DecisionHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DECISION_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
