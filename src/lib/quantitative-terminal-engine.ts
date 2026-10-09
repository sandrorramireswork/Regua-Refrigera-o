/**
 * High-Frequency Quantitative Terminal Engine (Bloomberg Style)
 * Motor Quantitativo Avançado para Análise de Roleta Europeia
 *
 * Módulos Integrados:
 * 1. Matriz de Markov Multidimensional: P(Cor + Setor | Cor + Setor anterior)
 * 2. Z-Score Espacial e Detecção de Anomalias em Clusters Balísticos (Arcos de 3 a 5 bolsões)
 * 3. Índice de Entropia de Shannon (Termômetro do Caos em Janela de 25 Giros)
 * 4. Filtro Comportamental Anti-Tilt com Modo Refúgio (60s Lock)
 * 5. Avaliador de UI Mutante (Modo Predador vs Modo Escudo vs Modo Refúgio)
 * 6. Calculadora de Kelly Criterion Dinâmica para Clusters Quentes
 */

import { CYBER_CILINDRO, CYBER_REDS } from "@/lib/cyber-balistica-engine";

/* =========================================================================
   1. DEFINIÇÕES FÍSICAS DO CILINDRO EUROPEU (ROTOR FÍSICO)
   ========================================================================= */

export const CILINDRO_EUROPEU: readonly number[] = CYBER_CILINDRO;

export const SETOR_VOISINS: readonly number[] = [
  22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25,
];

export const SETOR_TIERS: readonly number[] = [
  27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33,
];

export const SETOR_ORPHELINS: readonly number[] = [
  1, 20, 14, 31, 9, 17, 34, 6,
];

export const SETOR_JEU_ZERO: readonly number[] = [
  12, 35, 3, 26, 0, 32, 15,
];

export type CylinderSector = "VOISINS" | "TIERS" | "ORPHELINS";
export type WheelColor = "RED" | "BLACK" | "GREEN";

export function getSector(n: number): CylinderSector {
  if (SETOR_VOISINS.includes(n)) return "VOISINS";
  if (SETOR_TIERS.includes(n)) return "TIERS";
  return "ORPHELINS";
}

export function getColor(n: number): WheelColor {
  if (n === 0) return "GREEN";
  return CYBER_REDS.includes(n) ? "RED" : "BLACK";
}

/* =========================================================================
   2. MATRIZ DE MARKOV MULTIDIMENSIONAL (COR + SETOR DO CILINDRO)
   ========================================================================= */

export type MarkovCombinedState =
  | "RED_VOISINS"
  | "BLACK_VOISINS"
  | "RED_TIERS"
  | "BLACK_TIERS"
  | "RED_ORPHELINS"
  | "BLACK_ORPHELINS"
  | "ZERO_PIVOT";

export const MARKOV_STATES: readonly MarkovCombinedState[] = [
  "RED_VOISINS",
  "BLACK_VOISINS",
  "RED_TIERS",
  "BLACK_TIERS",
  "RED_ORPHELINS",
  "BLACK_ORPHELINS",
  "ZERO_PIVOT",
] as const;

export interface StateInfo {
  state: MarkovCombinedState;
  label: string;
  shortLabel: string;
  color: string;
  textColor: string;
  numbers: number[];
  theoreticalProbability: number; // |numbers| / 37
}

export const MARKOV_STATE_INFO: Record<MarkovCombinedState, StateInfo> = {
  RED_VOISINS: {
    state: "RED_VOISINS",
    label: "Vermelho + Voisins",
    shortLabel: "RED · VOI",
    color: "#ff0055",
    textColor: "#ff4d88",
    numbers: [7, 12, 3, 32, 19, 21, 25],
    theoreticalProbability: 7 / 37, // ~18.92%
  },
  BLACK_VOISINS: {
    state: "BLACK_VOISINS",
    label: "Preto + Voisins",
    shortLabel: "BLK · VOI",
    color: "#00d2ff",
    textColor: "#38bdf8",
    numbers: [22, 18, 29, 28, 35, 26, 15, 4, 2],
    theoreticalProbability: 9 / 37, // ~24.32%
  },
  RED_TIERS: {
    state: "RED_TIERS",
    label: "Vermelho + Tiers",
    shortLabel: "RED · TIE",
    color: "#ff3366",
    textColor: "#fb7185",
    numbers: [27, 36, 23, 5, 16],
    theoreticalProbability: 5 / 37, // ~13.51%
  },
  BLACK_TIERS: {
    state: "BLACK_TIERS",
    label: "Preto + Tiers",
    shortLabel: "BLK · TIE",
    color: "#08f7fe",
    textColor: "#67e8f9",
    numbers: [13, 11, 30, 8, 10, 24, 33],
    theoreticalProbability: 7 / 37, // ~18.92%
  },
  RED_ORPHELINS: {
    state: "RED_ORPHELINS",
    label: "Vermelho + Orphelins",
    shortLabel: "RED · ORP",
    color: "#ff6600",
    textColor: "#fdba74",
    numbers: [1, 9, 14, 34],
    theoreticalProbability: 4 / 37, // ~10.81%
  },
  BLACK_ORPHELINS: {
    state: "BLACK_ORPHELINS",
    label: "Preto + Orphelins",
    shortLabel: "BLK · ORP",
    color: "#a855f7",
    textColor: "#c084fc",
    numbers: [20, 31, 17, 6],
    theoreticalProbability: 4 / 37, // ~10.81%
  },
  ZERO_PIVOT: {
    state: "ZERO_PIVOT",
    label: "Zero Pivot (Verde)",
    shortLabel: "ZERO · GRN",
    color: "#00ff88",
    textColor: "#4ade80",
    numbers: [0],
    theoreticalProbability: 1 / 37, // ~2.70%
  },
};

export function classifyCombinedState(n: number): MarkovCombinedState {
  if (n === 0) return "ZERO_PIVOT";
  const cor = getColor(n);
  const setor = getSector(n);
  if (cor === "RED" && setor === "VOISINS") return "RED_VOISINS";
  if (cor === "BLACK" && setor === "VOISINS") return "BLACK_VOISINS";
  if (cor === "RED" && setor === "TIERS") return "RED_TIERS";
  if (cor === "BLACK" && setor === "TIERS") return "BLACK_TIERS";
  if (cor === "RED" && setor === "ORPHELINS") return "RED_ORPHELINS";
  return "BLACK_ORPHELINS";
}

export interface MarkovTransitionCell {
  from: MarkovCombinedState;
  to: MarkovCombinedState;
  count: number;
  totalFrom: number;
  empiricalProb: number; // count / totalFrom
  theoreticalProb: number;
  deltaProb: number; // empiricalProb - theoreticalProb
  zScore: number;
  isHighProbability: boolean;
}

export interface MarkovPrediction {
  targetState: MarkovCombinedState;
  label: string;
  probability: number;
  deltaVsExpected: number;
  zScore: number;
  targetNumbers: number[];
  recommendation: "FORTE" | "MODERADA" | "NEUTRA";
}

export interface MultidimensionalMarkovResult {
  currentState: MarkovCombinedState | null;
  previousState: MarkovCombinedState | null;
  totalTransitions: number;
  matrix: Record<MarkovCombinedState, Record<MarkovCombinedState, MarkovTransitionCell>>;
  predictionsFromCurrent: MarkovPrediction[];
  topPrediction: MarkovPrediction | null;
}

/**
 * Calcula a Matriz de Markov Multidimensional completa (Cor + Setor)
 * History: números do mais recente (index 0) ao mais antigo (index N-1)
 */
export function calcularMatrizMarkovMultidimensional(
  history: number[],
): MultidimensionalMarkovResult {
  // Inicializa matriz vazia
  const matrix = {} as Record<
    MarkovCombinedState,
    Record<MarkovCombinedState, MarkovTransitionCell>
  >;

  for (const fromState of MARKOV_STATES) {
    matrix[fromState] = {} as Record<MarkovCombinedState, MarkovTransitionCell>;
    for (const toState of MARKOV_STATES) {
      matrix[fromState][toState] = {
        from: fromState,
        to: toState,
        count: 0,
        totalFrom: 0,
        empiricalProb: 0,
        theoreticalProb: MARKOV_STATE_INFO[toState].theoreticalProbability,
        deltaProb: 0,
        zScore: 0,
        isHighProbability: false,
      };
    }
  }

  if (history.length < 2) {
    const currentState = history.length === 1 ? classifyCombinedState(history[0]!) : null;
    return {
      currentState,
      previousState: null,
      totalTransitions: 0,
      matrix,
      predictionsFromCurrent: [],
      topPrediction: null,
    };
  }

  // Cronológico: antigo -> recente
  const chronological = [...history].reverse();
  const stateSequence = chronological.map(classifyCombinedState);

  const rowTotals: Record<MarkovCombinedState, number> = {
    RED_VOISINS: 0,
    BLACK_VOISINS: 0,
    RED_TIERS: 0,
    BLACK_TIERS: 0,
    RED_ORPHELINS: 0,
    BLACK_ORPHELINS: 0,
    ZERO_PIVOT: 0,
  };

  let totalTransitions = 0;

  for (let i = 0; i < stateSequence.length - 1; i++) {
    const from = stateSequence[i]!;
    const to = stateSequence[i + 1]!;
    matrix[from][to].count += 1;
    rowTotals[from] += 1;
    totalTransitions += 1;
  }

  // Normaliza probabilidades empíricas e Z-Score
  for (const from of MARKOV_STATES) {
    const totalFrom = rowTotals[from];
    for (const to of MARKOV_STATES) {
      const cell = matrix[from][to];
      cell.totalFrom = totalFrom;
      if (totalFrom > 0) {
        cell.empiricalProb = cell.count / totalFrom;
        cell.deltaProb = cell.empiricalProb - cell.theoreticalProb;

        // Z-score binomial: (obs - n*p) / sqrt(n*p*(1-p))
        const p = cell.theoreticalProb;
        const n = totalFrom;
        const se = Math.sqrt((p * (1 - p)) / n);
        cell.zScore = se > 0 ? (cell.empiricalProb - p) / se : 0;
        cell.isHighProbability = cell.empiricalProb >= 0.35 || cell.zScore >= 1.96;
      }
    }
  }

  const currentState = classifyCombinedState(history[0]!);
  const previousState = history.length > 1 ? classifyCombinedState(history[1]!) : null;

  // Previsões a partir do estado atual
  const predictionsFromCurrent: MarkovPrediction[] = [];
  const currentTotal = rowTotals[currentState];

  if (currentTotal >= 2) {
    for (const to of MARKOV_STATES) {
      const cell = matrix[currentState][to];
      const info = MARKOV_STATE_INFO[to];
      const rec: "FORTE" | "MODERADA" | "NEUTRA" =
        cell.zScore >= 2.0 && cell.empiricalProb > info.theoreticalProbability
          ? "FORTE"
          : cell.empiricalProb > info.theoreticalProbability * 1.25
          ? "MODERADA"
          : "NEUTRA";

      predictionsFromCurrent.push({
        targetState: to,
        label: info.label,
        probability: cell.empiricalProb,
        deltaVsExpected: cell.deltaProb,
        zScore: cell.zScore,
        targetNumbers: info.numbers,
        recommendation: rec,
      });
    }

    predictionsFromCurrent.sort((a, b) => b.probability - a.probability);
  }

  const topPrediction =
    predictionsFromCurrent.length > 0 && predictionsFromCurrent[0]!.probability > 0
      ? predictionsFromCurrent[0]!
      : null;

  return {
    currentState,
    previousState,
    totalTransitions,
    matrix,
    predictionsFromCurrent,
    topPrediction,
  };
}

/* =========================================================================
   3. Z-SCORE CLUSTERIZADO ESPACIAL (ANOMALIAS > +2.5 DESVIOS PADRÃO)
   ========================================================================= */

export interface BallisticCluster {
  id: string;
  name: string;
  centerNumber: number;
  size: number;
  numbers: number[];
  sector: CylinderSector;
  hits: number;
  sampleSize: number;
  expectedHits: number;
  empiricalProb: number;
  theoreticalProb: number;
  stdDev: number;
  zScore: number;
  isAnomaly: boolean; // z >= +2.5
  isMomentum: boolean; // z >= +2.0
  isVacuum: boolean; // z <= -2.0
  hotRank: number;
}

export interface SpatialZScoreAnalysis {
  sampleSize: number;
  allClusters: BallisticCluster[];
  topClusters: BallisticCluster[];
  maxZScore: number;
  hasCriticalAnomaly: boolean; // z >= 2.5
  criticalAnomalies: BallisticCluster[];
  activeClusterTargets: number[];
  rotorHeatmap: { number: number; clusterZScore: number; isHot: boolean }[];
}

/**
 * Cria clusters contíguos de 5 números no cilindro físico centrados em cada bolsão
 */
export function getBallisticClusterPockets(centerNumber: number, radius = 2): number[] {
  const idx = CILINDRO_EUROPEU.indexOf(centerNumber);
  if (idx < 0) return [centerNumber];
  const pockets: number[] = [];
  const len = CILINDRO_EUROPEU.length;
  for (let offset = -radius; offset <= radius; offset++) {
    const targetIdx = (idx + offset + len * 2) % len;
    pockets.push(CILINDRO_EUROPEU[targetIdx]!);
  }
  return pockets;
}

/**
 * Executa a análise de Z-Score espacial em todos os 37 clusters balísticos
 */
export function calcularZScoreEspacial(
  history: number[],
  windowLimit = 50,
): SpatialZScoreAnalysis {
  const windowSpins = history.slice(0, windowLimit);
  const sampleSize = windowSpins.length;

  if (sampleSize < 10) {
    return {
      sampleSize,
      allClusters: [],
      topClusters: [],
      maxZScore: 0,
      hasCriticalAnomaly: false,
      criticalAnomalies: [],
      activeClusterTargets: [],
      rotorHeatmap: CILINDRO_EUROPEU.map((num) => ({
        number: num,
        clusterZScore: 0,
        isHot: false,
      })),
    };
  }

  const clusters: BallisticCluster[] = [];
  const pTheor = 5 / 37; // cluster de 5 casas = 13.51%
  const expectedHits = sampleSize * pTheor;
  const variance = sampleSize * pTheor * (1 - pTheor);
  const stdDev = Math.sqrt(variance);

  // Calcula ocorrências em cada um dos 37 clusters de 5 bolsões
  for (const center of CILINDRO_EUROPEU) {
    const numbers = getBallisticClusterPockets(center, 2);
    const numSet = new Set(numbers);
    const hits = windowSpins.filter((s) => numSet.has(s)).length;
    const empiricalProb = hits / sampleSize;
    const zScore = stdDev > 0 ? (hits - expectedHits) / stdDev : 0;
    const isAnomaly = zScore >= 2.5;
    const isMomentum = zScore >= 2.0;
    const isVacuum = zScore <= -2.0;

    clusters.push({
      id: `cluster-center-${center}`,
      name: `Cluster Arc #${center}`,
      centerNumber: center,
      size: 5,
      numbers,
      sector: getSector(center),
      hits,
      sampleSize,
      expectedHits,
      empiricalProb,
      theoreticalProb: pTheor,
      stdDev,
      zScore,
      isAnomaly,
      isMomentum,
      isVacuum,
      hotRank: 0,
    });
  }

  // Ordena por maior Z-Score
  clusters.sort((a, b) => b.zScore - a.zScore);
  clusters.forEach((c, idx) => {
    c.hotRank = idx + 1;
  });

  const maxZScore = clusters[0]?.zScore ?? 0;
  const criticalAnomalies = clusters.filter((c) => c.isAnomaly);
  const topClusters = clusters.slice(0, 5);

  // Números alvos combinados dos clusters em momentum ou anomalia
  const activeTargetsSet = new Set<number>();
  for (const c of topClusters) {
    if (c.zScore >= 1.8) {
      c.numbers.forEach((num) => activeTargetsSet.add(num));
    }
  }

  const rotorHeatmap = CILINDRO_EUROPEU.map((num) => {
    const cluster = clusters.find((c) => c.centerNumber === num);
    const z = cluster?.zScore ?? 0;
    return {
      number: num,
      clusterZScore: z,
      isHot: z >= 2.0,
    };
  });

  return {
    sampleSize,
    allClusters: clusters,
    topClusters,
    maxZScore,
    hasCriticalAnomaly: criticalAnomalies.length > 0,
    criticalAnomalies,
    activeClusterTargets: Array.from(activeTargetsSet),
    rotorHeatmap,
  };
}

/* =========================================================================
   4. ÍNDICE DE ENTROPIA DE SHANNON (TERMÔMETRO DO CAOS - JANELA DE 25)
   ========================================================================= */

export type EntropyLevel = "BAIXA" | "MEDIA" | "ALTA";

export interface ShannonEntropyResult {
  windowSize: number;
  actualSpinsCount: number;
  shannonEntropy: number; // H em bits
  maxEntropy: number; // H_max em bits
  normalizedEntropy: number; // 0 a 1
  entropyPercent: number; // 0% a 100%
  level: EntropyLevel;
  statusLabel: string;
  statusDescription: string;
  sinaisLiberados: boolean; // TRUE se Baixa/Média (< 82%). FALSE se Alta (Caos Risco Extremo)
  colorClass: string;
  riskClass: string;
}

/**
 * Calcula a Entropia de Shannon dos últimos 25 giros
 * H = - SUM( p_i * log2(p_i) )
 * Normalizada para escala 0% a 100%
 */
export function calcularIndiceEntropia(
  history: number[],
  window = 25,
): ShannonEntropyResult {
  const windowSpins = history.slice(0, window);
  const N = windowSpins.length;

  if (N < 5) {
    // Poucos giros para avaliação estatística confiável
    return {
      windowSize: window,
      actualSpinsCount: N,
      shannonEntropy: 0,
      maxEntropy: 1,
      normalizedEntropy: 0.5,
      entropyPercent: 50,
      level: "MEDIA",
      statusLabel: "CALIBRANDO DADOS",
      statusDescription: `Aguardando amostra mínima (${N}/5 giros)`,
      sinaisLiberados: true,
      colorClass: "text-[#08f7fe] border-[#08f7fe]/40",
      riskClass: "bg-[#08f7fe]/10 text-[#08f7fe]",
    };
  }

  // Frequências dos números na janela
  const freqMap = new Map<number, number>();
  for (const num of windowSpins) {
    freqMap.set(num, (freqMap.get(num) ?? 0) + 1);
  }

  // Cálculo da Entropia de Shannon
  let H = 0;
  for (const count of freqMap.values()) {
    const p = count / N;
    if (p > 0) {
      H -= p * Math.log2(p);
    }
  }

  // H_max é a entropia quando todos os números da janela são distintos
  // Em N giros, o máximo de estados possíveis é min(N, 37)
  const maxStates = Math.min(N, 37);
  const H_max = Math.log2(maxStates);

  // Índice Normalizado (0 a 1)
  const normalized = H_max > 0 ? Math.min(1, Math.max(0, H / H_max)) : 0;
  const entropyPercent = Math.round(normalized * 1000) / 10;

  // Classificação Quantitativa Rígida:
  // < 68% -> BAIXA (Repetições & Clusters físicos nítidos = Oportunidade)
  // 68% a 82% -> MÉDIA (Mesa em transição / Formação de Padrão)
  // > 82% -> ALTA (Mesa Caótica = Risco Extremo / Ruído Branco)
  let level: EntropyLevel;
  let statusLabel: string;
  let statusDescription: string;
  let colorClass: string;
  let riskClass: string;
  let sinaisLiberados: boolean;

  if (normalized < 0.68) {
    level = "BAIXA";
    statusLabel = "MESA LEGÍVEL · ALTA CONVERGÊNCIA";
    statusDescription =
      "Agrupamento balístico detectado. Entropia reduzida e previsibilidade máxima.";
    colorClass = "text-[#00FF88] border-[#00FF88]/50";
    riskClass = "bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/40";
    sinaisLiberados = true;
  } else if (normalized <= 0.82) {
    level = "MEDIA";
    statusLabel = "TRANSIÇÃO · FILTRAGEM MODERADA";
    statusDescription =
      "Dispersão controlada. Opere com cautela e confirmação de Z-Score.";
    colorClass = "text-[#08f7fe] border-[#08f7fe]/50";
    riskClass = "bg-[#08f7fe]/15 text-[#08f7fe] border-[#08f7fe]/40";
    sinaisLiberados = true;
  } else {
    level = "ALTA";
    statusLabel = "MESA CAÓTICA · RISCO CRÍTICO";
    statusDescription =
      "Ruído branco e dispersão máxima. Sinais neon suspensos por segurança matemática.";
    colorClass = "text-[#FF003C] border-[#FF003C]/50";
    riskClass = "bg-[#FF003C]/20 text-[#FF003C] border-[#FF003C]/50 animate-pulse";
    sinaisLiberados = false; // Bloqueia gatilhos neon!
  }

  return {
    windowSize: window,
    actualSpinsCount: N,
    shannonEntropy: Math.round(H * 1000) / 1000,
    maxEntropy: Math.round(H_max * 1000) / 1000,
    normalizedEntropy: normalized,
    entropyPercent,
    level,
    statusLabel,
    statusDescription,
    sinaisLiberados,
    colorClass,
    riskClass,
  };
}

/* =========================================================================
   5. FILTRO COMPORTAMENTAL "ANTI-TILT" INVISÍVEL & MODO REFÚGIO
   ========================================================================= */

export interface AntiTiltState {
  isActive: boolean;
  lockExpiresAt: number | null;
  remainingSeconds: number;
  reason: string;
  triggerTimestamps: number[];
  averageSpeedMs: number;
}

/**
 * Proxy Comportamental que avalia a cadência de cliques no teclado numérico
 * Se o operador clicar em velocidade frenética (< 550ms em 3 cliques consecutivos),
 * ativa o Modo Refúgio de 60 segundos com bloqueio protetor de apostas.
 */
export class AntiTiltBehavioralProxy {
  private static clickHistory: number[] = [];
  private static lockExpiresAt: number | null = null;
  private static lastTriggerReason = "";

  /**
   * Registra clique no teclado numérico e retorna se ativou tilt
   */
  public static recordKeypadClick(): {
    triggered: boolean;
    remainingLock: number;
  } {
    const now = Date.now();

    // Se já estiver em lock ativo, preserva o tempo
    if (this.lockExpiresAt && now < this.lockExpiresAt) {
      return {
        triggered: true,
        remainingLock: Math.ceil((this.lockExpiresAt - now) / 1000),
      };
    }

    // Registra timestamp
    this.clickHistory.push(now);
    if (this.clickHistory.length > 10) {
      this.clickHistory.shift();
    }

    // Avalia os últimos 3 intervalos
    if (this.clickHistory.length >= 3) {
      const len = this.clickHistory.length;
      const t1 = this.clickHistory[len - 1]!;
      const t2 = this.clickHistory[len - 2]!;
      const t3 = this.clickHistory[len - 3]!;

      const diff1 = t1 - t2;
      const diff2 = t2 - t3;

      // Se 2 intervalos seguidos forem menores que 580ms -> Detecção de Tilt / Frenesi
      if (diff1 < 580 && diff2 < 580) {
        this.lockExpiresAt = now + 60000; // 60 segundos de bloqueio
        this.lastTriggerReason = `Sequência frenética detectada (${Math.round((diff1 + diff2) / 2)}ms entre inputs)`;
        return { triggered: true, remainingLock: 60 };
      }
    }

    return { triggered: false, remainingLock: 0 };
  }

  /**
   * Verifica o estado atual do bloqueio Anti-Tilt
   */
  public static getStatus(): AntiTiltState {
    const now = Date.now();
    const isActive = this.lockExpiresAt !== null && now < this.lockExpiresAt;
    const remainingSeconds = isActive
      ? Math.ceil((this.lockExpiresAt! - now) / 1000)
      : 0;

    let averageSpeedMs = 0;
    if (this.clickHistory.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < this.clickHistory.length; i++) {
        diffs.push(this.clickHistory[i]! - this.clickHistory[i - 1]!);
      }
      averageSpeedMs = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    }

    return {
      isActive,
      lockExpiresAt: this.lockExpiresAt,
      remainingSeconds,
      reason: this.lastTriggerReason,
      triggerTimestamps: [...this.clickHistory],
      averageSpeedMs,
    };
  }

  /**
   * Desbloqueio consciente voluntário (após respiração guiada de pelo menos 15s)
   */
  public static manualUnlock(): void {
    this.lockExpiresAt = null;
    this.clickHistory = [];
  }
}

/* =========================================================================
   6. UI MUTANTE (MORPHING LAYOUT: PREDADOR vs ESCUDO vs REFÚGIO)
   ========================================================================= */

export type MorphingLayoutMode = "PREDATOR" | "SHIELD" | "REFUGE";

export interface MorphingLayoutState {
  currentMode: MorphingLayoutMode;
  modeTitle: string;
  modeBadge: string;
  themeClasses: {
    containerBorder: string;
    glowShadow: string;
    accentColor: string;
    bgOverlay: string;
    statusBadge: string;
  };
  kellyRecommendation: {
    suggestedStakePercent: number; // Ex: 3.5%
    recommendedCluster: BallisticCluster | null;
    edgePercent: number;
    description: string;
  };
  tacticalDirective: string;
}

/**
 * Determina o perfil global da interface mutante baseado nos motores quantitativos
 */
export function avaliarModoLayout(
  entropy: ShannonEntropyResult,
  spatial: SpatialZScoreAnalysis,
  tiltActive: boolean,
  manualOverride?: MorphingLayoutMode | null,
): MorphingLayoutState {
  // 1. Prioridade Absoluta: Modo Refúgio (Anti-Tilt)
  if (tiltActive || manualOverride === "REFUGE") {
    return {
      currentMode: "REFUGE",
      modeTitle: "MODO REFÚGIO · ANTI-TILT ATIVO",
      modeBadge: "REFÚGIO ATIVO · RESPIRAÇÃO GUIADA",
      themeClasses: {
        containerBorder: "border-slate-500/40",
        glowShadow: "shadow-[0_0_30px_rgba(148,163,184,0.15)]",
        accentColor: "#94a3b8",
        bgOverlay: "bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#020617]",
        statusBadge: "bg-slate-800 text-slate-300 border border-slate-600",
      },
      kellyRecommendation: {
        suggestedStakePercent: 0,
        recommendedCluster: null,
        edgePercent: 0,
        description: "Operações estritamente pausadas para blindagem emocional.",
      },
      tacticalDirective:
        "Pico de Adrenalina Detectado. Respire. O mercado continuará lá.",
    };
  }

  // 2. Se houver override manual selecionado pelo operador
  if (manualOverride === "PREDATOR") {
    return buildPredatorMode(spatial, entropy);
  }
  if (manualOverride === "SHIELD") {
    return buildShieldMode(entropy);
  }

  // 3. Avaliação Automática:
  // Modo Predador: Entropia Baixa/Média (< 78%) E Z-Score de algum cluster balístico rompe +2.0
  const isPredatorTriggered =
    entropy.normalizedEntropy <= 0.78 && spatial.maxZScore >= 2.0;

  if (isPredatorTriggered) {
    return buildPredatorMode(spatial, entropy);
  }

  // 4. Modo Escudo (Padrão de Segurança / Alta Entropia / Variância Severa)
  return buildShieldMode(entropy);
}

function buildPredatorMode(
  spatial: SpatialZScoreAnalysis,
  entropy: ShannonEntropyResult,
): MorphingLayoutState {
  const topCluster = spatial.topClusters[0] ?? null;
  const pObs = topCluster ? topCluster.empiricalProb : 5 / 37;
  const b = 36 / 5 - 1; // Payoff líquido = 6.2x para aposta cobrindo 5 números
  const q = 1 - pObs;

  // Critério de Kelly Exato: f* = (bp - q) / b
  const fullKelly = (b * pObs - q) / b;
  // Usamos Half-Kelly (50% da taxa ideal) para controle de volatilidade
  const halfKellyPerc = Math.max(0.5, Math.min(6.5, (fullKelly / 2) * 100));

  return {
    currentMode: "PREDATOR",
    modeTitle: "MODO PREDADOR · ATAQUE QUANTITATIVO",
    modeBadge: `⚡ PREDADOR ATIVO [Z = +${spatial.maxZScore.toFixed(2)} | ENTROPIA ${entropy.entropyPercent}%]`,
    themeClasses: {
      containerBorder: "border-[#00FF88] border-2",
      glowShadow:
        "shadow-[0_0_40px_rgba(0,255,136,0.35),inset_0_0_15px_rgba(8,247,254,0.15)]",
      accentColor: "#00FF88",
      bgOverlay:
        "bg-gradient-to-b from-[#021812] via-[#041018] to-[#050507]",
      statusBadge:
        "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.5)] animate-pulse",
    },
    kellyRecommendation: {
      suggestedStakePercent: Math.round(halfKellyPerc * 10) / 10,
      recommendedCluster: topCluster,
      edgePercent: topCluster
        ? Math.round((topCluster.empiricalProb - topCluster.theoreticalProb) * 1000) / 10
        : 0,
      description: topCluster
        ? `Cluster ${topCluster.name} com desvio crítico (+${topCluster.zScore.toFixed(2)} SD). Half-Kelly sugere ${halfKellyPerc.toFixed(1)}% da banca.`
        : "Oportunidade identificada por desvio estatístico robusto.",
    },
    tacticalDirective:
      "CONVERGÊNCIA BALÍSTICA ATIVA: Execute entrada no cluster prioritário com gestão Half-Kelly rigorosa.",
  };
}

function buildShieldMode(entropy: ShannonEntropyResult): MorphingLayoutState {
  return {
    currentMode: "SHIELD",
    modeTitle: "MODO ESCUDO · PRESERVAÇÃO DE BANCA",
    modeBadge: `🛡️ MODO ESCUDO ATIVO [ENTROPIA ELEVADA ${entropy.entropyPercent}%]`,
    themeClasses: {
      containerBorder: "border-rose-950/70",
      glowShadow: "shadow-[0_0_25px_rgba(244,63,94,0.1)]",
      accentColor: "#f43f5e",
      bgOverlay: "bg-gradient-to-b from-[#140608] via-[#0a0a0d] to-[#050507]",
      statusBadge:
        "bg-rose-950/40 text-rose-300 border border-rose-800/60 shadow-[0_0_10px_rgba(244,63,94,0.2)]",
    },
    kellyRecommendation: {
      suggestedStakePercent: 0,
      recommendedCluster: null,
      edgePercent: 0,
      description:
        "Mercado em ruído caótico ou dispersão aleatória. Preservação de capital prioritária.",
    },
    tacticalDirective:
      "STAND BY / PASSIVIDADE TÁTICA: Não force entradas contra a entropia. Aguarde compressão de variância.",
  };
}
