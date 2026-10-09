import {
  CILINDRO,
  VOISINS,
  TIERS,
  ORPHELINS,
  getProps,
  type Spin,
} from "@/lib/roulette";

/* ═════════════════════════════════════════════════════════════════════
   1. CONSTANTES E COMPATIBILIDADE LEGADA (TABELA PADRÃO F)
   ═════════════════════════════════════════════════════════════════════ */

export const DENSITY_WINDOW = 50;
export const HOT_ZONE_THRESHOLD = 40;
export const OFFSET_TRIGGER_SPIN = 12; // Regra de Offset: Gatilho ativo a partir da 12ª casa
export const MAX_HISTORY_GRID = 360;  // Grids de até 360 rodadas

export const DENSITY_QUADRANTS = [
  CILINDRO.filter((number) => number !== 0).slice(0, 9),
  CILINDRO.filter((number) => number !== 0).slice(9, 18),
  CILINDRO.filter((number) => number !== 0).slice(18, 27),
  CILINDRO.filter((number) => number !== 0).slice(27, 36),
] as const;

export interface DensityQuadrant {
  id: number;
  numbers: readonly number[];
  count: number;
  percentage: number;
  hot: boolean;
}

export interface DensityAnalysis {
  sampleSize: number;
  zeros: number;
  quadrants: DensityQuadrant[];
  hotZones: DensityQuadrant[];
  triggerSpinId: string | null;
}

export function analyzeDensity(spins: Spin[]): DensityAnalysis {
  const sample = spins.slice(0, DENSITY_WINDOW);
  const nonZero = sample.filter((spin) => spin.num !== 0);
  const quadrants = DENSITY_QUADRANTS.map((numbers, index) => {
    const set = new Set<number>(numbers);
    const count = nonZero.filter((spin) => set.has(spin.num)).length;
    const percentage = nonZero.length === 0 ? 0 : (count / nonZero.length) * 100;
    return { id: index + 1, numbers, count, percentage, hot: percentage > HOT_ZONE_THRESHOLD };
  });
  return {
    sampleSize: sample.length,
    zeros: sample.length - nonZero.length,
    quadrants,
    hotZones: quadrants.filter((quadrant) => quadrant.hot),
    triggerSpinId: spins[0]?.id ?? null,
  };
}

/* ═════════════════════════════════════════════════════════════════════
   2. NOVO MOTOR DE RADAR DE DENSIDADE (MATRIZ DE COLUNAS & 4 QUADRANTES)
   ═════════════════════════════════════════════════════════════════════ */

export interface QuadranteMatriz {
  id: string; // Ex: "C1-Q1"
  coluna: 1 | 2 | 3;
  quadrante: 1 | 2 | 3 | 4;
  label: string;
  numbers: [number, number, number];
  duziaPrincipal: 1 | 2 | 3;
}

/**
 * Mapeamento de Quadrantes:
 * Agrupa os números por colunas. Cada coluna é subdividida em 4 quadrantes
 * contendo exatamente 3 casas (3 números).
 */
export const MATRIZ_QUADRANTES_COLUNAS: QuadranteMatriz[] = [
  // Coluna 1: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
  { id: "C1-Q1", coluna: 1, quadrante: 1, label: "Coluna 1 · Quadrante 1", numbers: [1, 4, 7], duziaPrincipal: 1 },
  { id: "C1-Q2", coluna: 1, quadrante: 2, label: "Coluna 1 · Quadrante 2", numbers: [10, 13, 16], duziaPrincipal: 2 },
  { id: "C1-Q3", coluna: 1, quadrante: 3, label: "Coluna 1 · Quadrante 3", numbers: [19, 22, 25], duziaPrincipal: 2 },
  { id: "C1-Q4", coluna: 1, quadrante: 4, label: "Coluna 1 · Quadrante 4", numbers: [28, 31, 34], duziaPrincipal: 3 },

  // Coluna 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
  { id: "C2-Q1", coluna: 2, quadrante: 1, label: "Coluna 2 · Quadrante 1", numbers: [2, 5, 8], duziaPrincipal: 1 },
  { id: "C2-Q2", coluna: 2, quadrante: 2, label: "Coluna 2 · Quadrante 2", numbers: [11, 14, 17], duziaPrincipal: 2 },
  { id: "C2-Q3", coluna: 2, quadrante: 3, label: "Coluna 2 · Quadrante 3", numbers: [20, 23, 26], duziaPrincipal: 2 },
  { id: "C2-Q4", coluna: 2, quadrante: 4, label: "Coluna 2 · Quadrante 4", numbers: [29, 32, 35], duziaPrincipal: 3 },

  // Coluna 3: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
  { id: "C3-Q1", coluna: 3, quadrante: 1, label: "Coluna 3 · Quadrante 1", numbers: [3, 6, 9], duziaPrincipal: 1 },
  { id: "C3-Q2", coluna: 3, quadrante: 2, label: "Coluna 3 · Quadrante 2", numbers: [12, 15, 18], duziaPrincipal: 2 },
  { id: "C3-Q3", coluna: 3, quadrante: 3, label: "Coluna 3 · Quadrante 3", numbers: [21, 24, 27], duziaPrincipal: 2 },
  { id: "C3-Q4", coluna: 3, quadrante: 4, label: "Coluna 3 · Quadrante 4", numbers: [30, 33, 36], duziaPrincipal: 3 },
];

export interface PatternConvergence {
  ativa: boolean;
  variavelA: string;
  variavelB: string;
  mensagem: string;
}

export interface DensityRadarSignal {
  id: string;
  coluna: number;
  quadrante: number;
  quadranteId: string;
  labelAlvo: string;
  numeros: [number, number, number];
  densidadeQuadrantePerc: number;
  forcaColunaPerc: number;
  forcaDuziaPerc: number;
  corTendencia: "Vermelho" | "Preto";
  corPerc: number;
  setorFisico: string;
  setorPerc: number;
  convergencia: PatternConvergence | null;
  confianca: number;
  triggerSpinId: string;
  timestamp: number;
  offsetAtivo: boolean; // Confirma que iniciou a partir da 12ª casa
}

/**
 * Radar de Aproximação (Live Convergence):
 * Escuta se a densidade de um quadrante está convergindo matematicamente com
 * outra variável (Dúzia, Coluna, Cor ou Setor Físico) que também está esquentando.
 */
export function patternObserver(
  densidadeQuadrante: number,
  forcaColuna: number,
  forcaDuzia: number,
  corPerc: number,
  setorPerc: number,
  labelQuadrante: string,
  duziaId: number,
  colunaId: number
): PatternConvergence | null {
  // 1. Convergência com Dúzia correspondente
  const deltaDuzia = Math.abs(densidadeQuadrante - (forcaDuzia / 2));
  if (deltaDuzia <= 7 && densidadeQuadrante >= 18 && forcaDuzia >= 33) {
    return {
      ativa: true,
      variavelA: `Quadrante (${labelQuadrante})`,
      variavelB: `${duziaId}ª Dúzia`,
      mensagem: `⚠️ ATENÇÃO: Análise de Quadrante (${labelQuadrante}) se aproximando de ${duziaId}ª Dúzia - Alta probabilidade de cruzamento!`,
    };
  }

  // 2. Convergência com Coluna correspondente
  const deltaColuna = Math.abs(densidadeQuadrante - (forcaColuna / 2));
  if (deltaColuna <= 7 && densidadeQuadrante >= 18 && forcaColuna >= 33) {
    return {
      ativa: true,
      variavelA: `Quadrante (${labelQuadrante})`,
      variavelB: `${colunaId}ª Coluna`,
      mensagem: `⚠️ ATENÇÃO: Análise de Quadrante (${labelQuadrante}) se aproximando de ${colunaId}ª Coluna - Alta probabilidade de cruzamento!`,
    };
  }

  // 3. Convergência com Setor Físico
  const deltaSetor = Math.abs(densidadeQuadrante - setorPerc);
  if (deltaSetor <= 6 && densidadeQuadrante >= 18 && setorPerc >= 30) {
    return {
      ativa: true,
      variavelA: `Quadrante (${labelQuadrante})`,
      variavelB: `Setor Físico`,
      mensagem: `⚠️ ATENÇÃO: Análise de Quadrante (${labelQuadrante}) se aproximando de Setor Físico - Alta probabilidade de cruzamento!`,
    };
  }

  // 4. Convergência com Tendência de Cor
  if (densidadeQuadrante >= 20 && corPerc >= 55) {
    return {
      ativa: true,
      variavelA: `Quadrante (${labelQuadrante})`,
      variavelB: `Tendência de Cor`,
      mensagem: `⚠️ ATENÇÃO: Análise de Quadrante (${labelQuadrante}) se aproximando de Tendência de Cor - Alta probabilidade de cruzamento!`,
    };
  }

  return null;
}

/**
 * Analisa a matriz de histórico (até 360 rodadas) e gera o Alerta do Radar de Densidade.
 * Regra de Negócio: Gatilho ativo estritamente a partir da 12ª casa (offset da 2ª linha).
 */
export function analyzeDensityRadar(spins: Spin[]): DensityRadarSignal | null {
  if (!spins || spins.length < OFFSET_TRIGGER_SPIN) {
    // Dados antes do marcador da 12ª casa servem apenas para contexto de fundo.
    return null;
  }

  // Amostra ativa até 360 rodadas
  const gridTotal = spins.slice(0, Math.min(MAX_HISTORY_GRID, spins.length));
  // Janela ativa pós-offset (últimos 24 giros para sensibilidade alta de densidade)
  const janelaAtiva = gridTotal.slice(0, Math.min(24, gridTotal.length));
  const totalGiros = janelaAtiva.length;
  if (totalGiros < 12) return null;

  const ultimoSpin = spins[0];
  if (!ultimoSpin) return null;

  // Estatísticas globais da janela ativa
  let col1Count = 0;
  let col2Count = 0;
  let col3Count = 0;

  let duz1Count = 0;
  let duz2Count = 0;
  let duz3Count = 0;

  let redCount = 0;
  let blackCount = 0;

  let voisinsCount = 0;
  let tiersCount = 0;
  let orphelinsCount = 0;

  janelaAtiva.forEach((s) => {
    if (s.num === 0) return;
    const p = getProps(s.num);
    if (p.coluna === 1) col1Count++;
    else if (p.coluna === 2) col2Count++;
    else if (p.coluna === 3) col3Count++;

    if (p.duzia === 1) duz1Count++;
    else if (p.duzia === 2) duz2Count++;
    else if (p.duzia === 3) duz3Count++;

    if (p.cor === "red") redCount++;
    else if (p.cor === "black") blackCount++;

    if (VOISINS.includes(s.num)) voisinsCount++;
    else if (TIERS.includes(s.num)) tiersCount++;
    else if (ORPHELINS.includes(s.num)) orphelinsCount++;
  });

  const forcaColunas: Record<number, number> = {
    1: (col1Count / totalGiros) * 100,
    2: (col2Count / totalGiros) * 100,
    3: (col3Count / totalGiros) * 100,
  };

  const forcaDuzias: Record<number, number> = {
    1: (duz1Count / totalGiros) * 100,
    2: (duz2Count / totalGiros) * 100,
    3: (duz3Count / totalGiros) * 100,
  };

  const corDominante: "Vermelho" | "Preto" = redCount >= blackCount ? "Vermelho" : "Preto";
  const corPerc = (Math.max(redCount, blackCount) / totalGiros) * 100;

  // Avaliação de cada um dos 12 quadrantes
  interface CandidatoQuadrante {
    matriz: QuadranteMatriz;
    aparições: number;
    densidadePerc: number;
    convergencia: PatternConvergence | null;
    scoreTotal: number;
  }

  const candidatos: CandidatoQuadrante[] = MATRIZ_QUADRANTES_COLUNAS.map((matriz) => {
    const numsSet = new Set(matriz.numbers);
    const aparições = janelaAtiva.filter((s) => numsSet.has(s.num)).length;
    const densidadePerc = (aparições / totalGiros) * 100;

    const forcaCol = forcaColunas[matriz.coluna] || 0;
    const forcaDuz = forcaDuzias[matriz.duziaPrincipal] || 0;

    // Setor predominante do quadrante
    let setorNome = "Voisins";
    let setorPerc = (voisinsCount / totalGiros) * 100;
    const emTiers = matriz.numbers.filter((n) => TIERS.includes(n)).length;
    const emOrph = matriz.numbers.filter((n) => ORPHELINS.includes(n)).length;
    if (emTiers >= 2) {
      setorNome = "Tiers";
      setorPerc = (tiersCount / totalGiros) * 100;
    } else if (emOrph >= 2) {
      setorNome = "Orphelins";
      setorPerc = (orphelinsCount / totalGiros) * 100;
    }

    const convergencia = patternObserver(
      densidadePerc,
      forcaCol,
      forcaDuz,
      corPerc,
      setorPerc,
      matriz.label,
      matriz.duziaPrincipal,
      matriz.coluna
    );

    // Score composto
    let scoreTotal = densidadePerc * 1.5 + (forcaCol * 0.4) + (forcaDuz * 0.4);
    if (convergencia?.ativa) scoreTotal += 20;

    return {
      matriz,
      aparições,
      densidadePerc,
      convergencia,
      scoreTotal,
    };
  });

  // Ordena pelo maior score e densidade
  candidatos.sort((a, b) => b.scoreTotal - a.scoreTotal);
  const campeao = candidatos[0];

  // Limiar de disparo: densidade >= 18% (mais do que o dobro do esperado) OU convergência ativa
  if (!campeao || (campeao.densidadePerc < 18 && !campeao.convergencia?.ativa)) {
    return null;
  }

  const mat = campeao.matriz;
  const setorFisico = mat.numbers.filter((n) => TIERS.includes(n)).length >= 2
    ? "Tiers"
    : mat.numbers.filter((n) => ORPHELINS.includes(n)).length >= 2
    ? "Orphelins"
    : "Voisins";

  const setorPerc = setorFisico === "Tiers"
    ? (tiersCount / totalGiros) * 100
    : setorFisico === "Orphelins"
    ? (orphelinsCount / totalGiros) * 100
    : (voisinsCount / totalGiros) * 100;

  // Confiança: 94% a 98%
  let confianca = 92;
  if (campeao.densidadePerc >= 25) confianca += 3;
  if (campeao.convergencia?.ativa) confianca += 3;
  confianca = Math.min(98, Math.max(94, confianca));

  return {
    id: `density-${mat.id}-${ultimoSpin.id}`,
    coluna: mat.coluna,
    quadrante: mat.quadrante,
    quadranteId: mat.id,
    labelAlvo: `Coluna ${mat.coluna} · Quadrante ${mat.quadrante}`,
    numeros: mat.numbers,
    densidadeQuadrantePerc: campeao.densidadePerc,
    forcaColunaPerc: forcaColunas[mat.coluna] || 0,
    forcaDuziaPerc: forcaDuzias[mat.duziaPrincipal] || 0,
    corTendencia: corDominante,
    corPerc,
    setorFisico,
    setorPerc,
    convergencia: campeao.convergencia,
    confianca,
    triggerSpinId: ultimoSpin.id,
    timestamp: Date.now(),
    offsetAtivo: true,
  };
}