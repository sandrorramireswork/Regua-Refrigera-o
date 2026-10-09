import {
  CILINDRO,
  REDS,
  SETORES_PADRAO,
  VOISINS,
  TIERS,
  ORPHELINS,
  getProps,
  vizinhos,
  type Spin,
} from "./roulette";

export interface ConfluenceConfig {
  /** Janela de análise micro em rodadas (Padrão: 30) */
  window_size: number;
  /** Peso percentual da física de quinas/diamantes (Padrão: 35%) */
  weight_deflection: number;
  /** Peso das tendências de Dúzia, Coluna e Cor (Padrão: 35%) */
  weight_patterns: number;
  /** Limite para gatilho de regressão à média dos ciclos (Padrão: 3.0) */
  macro_cycle_threshold: number;
  /** Porcentagem mínima de confluência para disparar o alerta visual (Padrão: 85%) */
  min_confidence_trigger: number;
  /** Janela curta de rastreamento de espelhos e raízes (Padrão: 7 rodadas, 5 a 30) */
  mirror_window_size: number;
}

export const DEFAULT_CONFLUENCE_CONFIG: ConfluenceConfig = {
  window_size: 30,
  weight_deflection: 35,
  weight_patterns: 35,
  macro_cycle_threshold: 3.0,
  min_confidence_trigger: 85,
  mirror_window_size: 7,
};

export interface EngineBreakdown {
  /** Engine 1: Micro Análise e Deflexão Física (0..100) */
  engine1_micro: number;
  /** Engine 2: Força de Padrões (Dúzia, Coluna, Cor) (0..100) */
  engine2_patterns: number;
  /** Engine 3: Macro Análise e Regressão à Média (Ciclos) (0..100) */
  engine3_macro: number;
}

export interface CandidateConfluence {
  number: number;
  confidence: number;
  color: "red" | "black" | "green";
  dozen: number;
  column: number;
  sector: string;
  tags: string[];
  breakdown: EngineBreakdown;
  neighborHits: number;
  microFrequency: number;
  delay: number;
}

export interface ConfluenceAnalysis {
  active: boolean;
  topCandidate: CandidateConfluence | null;
  candidates: CandidateConfluence[];
  totalSpins: number;
  config: ConfluenceConfig;
  sectorMomentum: {
    voisinsRatio: number;
    tiersRatio: number;
    orphelinsRatio: number;
    hottestSector: string;
    coldestSector: string;
  };
}

/**
 * Motor central de confluência lógica, física e estatística da roleta europeia
 */
export function analyzeConfluence(
  spins: Spin[],
  config: ConfluenceConfig = DEFAULT_CONFLUENCE_CONFIG,
): ConfluenceAnalysis {
  const totalSpins = spins.length;

  if (totalSpins < 5) {
    return {
      active: false,
      topCandidate: null,
      candidates: [],
      totalSpins,
      config,
      sectorMomentum: {
        voisinsRatio: 1,
        tiersRatio: 1,
        orphelinsRatio: 1,
        hottestSector: "—",
        coldestSector: "—",
      },
    };
  }

  // 1. Recorte da janela micro
  const microWindow = spins.slice(0, Math.min(config.window_size, totalSpins));
  const microSize = microWindow.length;
  const macroWindow = spins; // Histórico global para análise de ciclos

  // 2. Frequências na janela micro
  const microCount = new Map<number, number>();
  microWindow.forEach((s) => {
    microCount.set(s.num, (microCount.get(s.num) ?? 0) + 1);
  });

  // 3. Delays atuais de cada número (espera desde a última saída)
  const delays = new Map<number, number>();
  for (let n = 0; n <= 36; n++) {
    const idx = spins.findIndex((s) => s.num === n);
    delays.set(n, idx === -1 ? totalSpins : idx);
  }

  // 4. Momentum de Grupos na janela micro (Engine 2: Dúzia, Coluna, Cor)
  let doz1 = 0, doz2 = 0, doz3 = 0;
  let col1 = 0, col2 = 0, col3 = 0;
  let red = 0, black = 0, green = 0;

  microWindow.forEach((s) => {
    if (s.num === 0) {
      green++;
    } else {
      if (s.num <= 12) doz1++;
      else if (s.num <= 24) doz2++;
      else doz3++;

      if (s.num % 3 === 1) col1++;
      else if (s.num % 3 === 2) col2++;
      else col3++;

      if (REDS.includes(s.num)) red++;
      else black++;
    }
  });

  const dozExpected = microSize / 3;
  const colExpected = microSize / 3;
  const redBlackExpected = (microSize * 18) / 37;

  // Ratios de momentum (1.0 = esperado, > 1.25 = quente)
  const dozMomentum = [
    0,
    doz1 / (dozExpected || 1),
    doz2 / (dozExpected || 1),
    doz3 / (dozExpected || 1),
  ];
  const colMomentum = [
    0,
    col1 / (colExpected || 1),
    col2 / (colExpected || 1),
    col3 / (colExpected || 1),
  ];
  const colorMomentum = {
    red: red / (redBlackExpected || 1),
    black: black / (redBlackExpected || 1),
    green: green / ((microSize / 37) || 1),
  };

  // 5. Macro Análise de Ciclos e Setores (Engine 3)
  let vCount = 0, tCount = 0, oCount = 0;
  macroWindow.forEach((s) => {
    if (VOISINS.includes(s.num)) vCount++;
    else if (TIERS.includes(s.num)) tCount++;
    else if (ORPHELINS.includes(s.num)) oCount++;
  });

  const vExp = (macroWindow.length * 17) / 37;
  const tExp = (macroWindow.length * 12) / 37;
  const oExp = (macroWindow.length * 8) / 37;

  const vRatio = vCount / (vExp || 1);
  const tRatio = tCount / (tExp || 1);
  const oRatio = oCount / (oExp || 1);

  // Setor mais quente e mais frio no macro
  const sectorList = [
    { name: "Voisins", ratio: vRatio, numbers: VOISINS },
    { name: "Tiers", ratio: tRatio, numbers: TIERS },
    { name: "Orphelins", ratio: oRatio, numbers: ORPHELINS },
  ];
  sectorList.sort((a, b) => b.ratio - a.ratio);
  const hottestSector = sectorList[0]!;
  const coldestSector = sectorList[sectorList.length - 1]!;

  // 6. Avaliação Confluente para cada um dos 37 números
  const candidates: CandidateConfluence[] = [];

  for (let n = 0; n <= 36; n++) {
    const props = getProps(n);
    const tags: string[] = [];

    /* ══════════════════════════════════════════════════════════════════
       ENGINE 1: MICRO ANÁLISE E DEFLEXÃO FÍSICA (Janela de X Rodadas)
       ══════════════════════════════════════════════════════════════════ */
    const hits = microCount.get(n) ?? 0;
    const expectedHits = microSize / 37;
    let scoreRepetition = (hits / (expectedHits || 1)) * 30; // base micro

    // Algoritmo de Proximidade e Deflexão Física nas Quinas/Diamantes:
    // Identifica os 2 vizinhos de cada lado no cilindro europeu
    const viz = vizinhos(n, 2).filter((v) => v !== n);
    let neighborHits = 0;
    viz.forEach((v) => {
      neighborHits += microCount.get(v) ?? 0;
    });

    const expectedNeighborHits = (microSize * 4) / 37;
    const deflectionRatio = neighborHits / (expectedNeighborHits || 1);

    // Multiplicador de deflexão simulando quiques nas quinas em direção ao centro
    let deflectionScore = 0;
    if (deflectionRatio >= 1.15) {
      deflectionScore = Math.min(
        100,
        deflectionRatio * (config.weight_deflection * 1.5)
      );
      tags.push("Vizinho Físico");
    }

    if (hits >= 2) {
      tags.push("Repetição Micro");
    }

    const engine1Score = Math.min(
      100,
      scoreRepetition * 0.4 + deflectionScore * 0.6
    );

    /* ══════════════════════════════════════════════════════════════════
       ENGINE 2: FORÇA DE PADRÕES (Dúzia, Coluna, Cor)
       ══════════════════════════════════════════════════════════════════ */
    let patternScore = 0;
    if (n === 0) {
      patternScore = Math.min(100, colorMomentum.green * 40);
    } else {
      const dMom = dozMomentum[props.duzia] ?? 1;
      const cMom = colMomentum[props.coluna] ?? 1;
      const colorMom = props.cor === "red" ? colorMomentum.red : colorMomentum.black;

      if (dMom >= 1.25) tags.push("Dúzia Quente");
      if (cMom >= 1.25) tags.push("Coluna Quente");
      if (colorMom >= 1.2) tags.push("Cor em Momentum");

      const combinedMomentum = (dMom * 0.38 + cMom * 0.38 + colorMom * 0.24);
      patternScore = Math.min(100, combinedMomentum * config.weight_patterns * 1.4);
    }
    const engine2Score = Math.min(100, patternScore);

    /* ══════════════════════════════════════════════════════════════════
       ENGINE 3: MACRO ANÁLISE E REGRESSÃO À MÉDIA (Ciclos de Setor)
       ══════════════════════════════════════════════════════════════════ */
    let macroScore = 0;
    const currentDelay = delays.get(n) ?? 0;
    const isColdSector = coldestSector.numbers.includes(n);
    const isHottestSectorSaturated = hottestSector.ratio >= 1.25;

    // Se o setor mais quente atingiu saturação e o número candidato pertence ao
    // setor frio adjacente ou está em atraso, a regressão à média impulsiona a entrada
    if (isHottestSectorSaturated && isColdSector) {
      tags.push("Regressão Setor");
      const delayFactor = Math.min(2.5, currentDelay / 25);
      macroScore = Math.min(
        100,
        (hottestSector.ratio - 1) * config.macro_cycle_threshold * 22 + delayFactor * 25
      );
    } else if (currentDelay >= 35) {
      tags.push("Atraso Crítico");
      macroScore = Math.min(85, (currentDelay / 45) * 60);
    } else {
      macroScore = Math.max(15, (1 / (vRatio || 1)) * 25);
    }
    const engine3Score = Math.min(100, macroScore);

    /* ══════════════════════════════════════════════════════════════════
       CÁLCULO DO ÍNDICE DE CONFLUÊNCIA FINAL
       ══════════════════════════════════════════════════════════════════ */
    // Ponderação balanceada garantindo calibração realista de 0 a 100%
    const w1 = config.weight_deflection / 100;
    const w2 = config.weight_patterns / 100;
    const w3 = (config.macro_cycle_threshold * 10) / 100;

    const totalWeight = w1 + w2 + w3 || 1;
    const rawConfidence =
      (engine1Score * w1 + engine2Score * w2 + engine3Score * w3) / totalWeight;

    // Bônus multiplicativo de confluência se 2 ou mais engines confirmarem
    let synergyMultiplier = 1.0;
    let confirmations = 0;
    if (engine1Score >= 60) confirmations++;
    if (engine2Score >= 60) confirmations++;
    if (engine3Score >= 60) confirmations++;

    if (confirmations === 3) synergyMultiplier = 1.22;
    else if (confirmations === 2) synergyMultiplier = 1.12;

    const finalConfidence = Math.min(
      99,
      Math.max(10, Math.round(rawConfidence * synergyMultiplier))
    );

    candidates.push({
      number: n,
      confidence: finalConfidence,
      color: props.cor,
      dozen: props.duzia,
      column: props.coluna,
      sector: props.setor,
      tags: Array.from(new Set(tags)),
      breakdown: {
        engine1_micro: Math.round(engine1Score),
        engine2_patterns: Math.round(engine2Score),
        engine3_macro: Math.round(engine3Score),
      },
      neighborHits,
      microFrequency: hits,
      delay: currentDelay,
    });
  }

  // Ordena os candidatos pela maior confluência
  candidates.sort((a, b) => b.confidence - a.confidence || a.delay - b.delay);

  const topCandidate = candidates[0] ?? null;
  const isTriggered =
    topCandidate !== null && topCandidate.confidence >= config.min_confidence_trigger;

  return {
    active: isTriggered,
    topCandidate: isTriggered ? topCandidate : null,
    candidates,
    totalSpins,
    config,
    sectorMomentum: {
      voisinsRatio: vRatio,
      tiersRatio: tRatio,
      orphelinsRatio: oRatio,
      hottestSector: hottestSector.name,
      coldestSector: coldestSector.name,
    },
  };
}
