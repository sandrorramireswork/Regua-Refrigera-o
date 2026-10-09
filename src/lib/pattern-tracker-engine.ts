import type { Spin, SectorDef, Padrao } from "./roulette";
import { getProps, SETORES_PADRAO, checarRegra, PADROES_PADRAO } from "./roulette";

export type ResultadoRodada = "GREEN" | "RED";

export type StatusValidacao =
  | "VALIDO"
  | "AGUARDANDO_AMOSTRA"
  | "ABAIXO_META"
  | "QUEBRA_PADRAO";

export interface TrackedPatternRound {
  spinIndex: number;
  triggerSpinId: string;
  triggerNum: number;
  entryNum1?: number;
  entryNum2?: number;
  result: ResultadoRodada;
  hitEntry?: 1 | 2;
  winningNumber?: number;
}

export interface TrackedPattern {
  id: string;
  code: string;
  nome: string;
  alvosText: string;
  alvosArray: number[];
  regraDescricao: string;

  /** Métricas limitadas à JANELA DESLIZANTE (últimas 30 rodadas) */
  janelaTamanho: number; // 30
  totalGreens: number; // Greens na janela
  totalReds: number; // Reds na janela
  totalRounds: number; // Total de rodadas na janela (máx 30)
  taxaGreens: number; // 0 a 100 (%) na janela

  /** Score de Confiança (0 a 100) — Nível Expert */
  scoreConfianca: number;

  /** Último resultado registrado na linha do tempo do padrão */
  ultimoResultado: ResultadoRodada | null;
  ultimoResultadoTexto: string;

  /** Status e qualificações */
  statusValidacao: StatusValidacao;
  statusTexto: string;
  isValido: boolean; // totalRounds >= 6 && scoreConfianca > 80 && !isQuebraPadrao
  rodadasRestantesParaValidacao: number; // max(0, 6 - totalRounds)

  /** Alertas de quebra de padrão */
  isQuebraPadrao: boolean; // 2 Reds seguidos na linha do tempo
  consecutiveReds: number; // Contagem de Reds consecutivos no final

  /** Histórico de resultados na janela deslizante */
  historico: ResultadoRodada[];
  rodadasDetalhes: TrackedPatternRound[]; // últimas 30 rodadas

  /** Zonas mapeadas para onde o padrão aponta */
  alvoDuziasDominantes: (1 | 2 | 3)[];
  alvoColunasDominantes: (1 | 2 | 3)[];
}

export interface GroupScore {
  idx: 1 | 2 | 3;
  nome: string;
  greens: number;
  score: number;
  perc: number; // Pressão de Confluência (%)
  multiplicador: number; // 1.0x ou 2.0x (quando >= 2 padrões válidos)
  hasMultiplicador: boolean; // true se multiplicador >= 2
  padroesConvergentes: string[]; // Códigos dos padrões com Score > 80 convergindo
  numeros: number[];
}

export interface ConfluenceCalculation {
  statusEntrada: "CONFIRMADA" | "STANDBY_AMOSTRA" | "STANDBY_SEM_CONFLUENCIA";
  statusBadge: string;
  totalPadroesMonitorados: number;
  totalPadroesValidos: number;
  padroesValidos: TrackedPattern[];
  somaGreensValidos: number;
  duziaMaisForte: GroupScore;
  colunaMaisForte: GroupScore;
  rankingDuzias: GroupScore[];
  rankingColunas: GroupScore[];
  numerosIntersecao: number[];
  confiancaPerc: number;
  pressaoConfluenciaGeral: number; // Média da pressão das zonas dominantes
  isEntradaExpert: boolean; // Alerta Estroboscópico Sutil ativado
  pressaoMinimaConfigurada: number;
  justificativa: string;
}

/** Padrões táticos padrão enriquecidos com alvos numéricos e regras explícitas */
export const CATALOGO_PADROES_TATICOS: Padrao[] = [
  ...PADROES_PADRAO,
  {
    id: "p5",
    code: "P5",
    nome: "Repetição de Terminais / Espelhos",
    alvos: "11, 22, 33, 12, 21, 13, 31, 23",
    regra: { type: "repeat_color", count: 3 },
    ativa: true,
    position: 5,
  },
  {
    id: "p6",
    code: "P6",
    nome: "Quebra de Coluna Contínua",
    alvos: "2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35",
    regra: { type: "repeat_column", count: 2 },
    ativa: true,
    position: 6,
  },
];

/** Constantes do Motor de Decisão Nível Expert */
export const JANELA_DESLIZANTE_MAX = 30; // Janela deslizante máxima de 30 rodadas por padrão
export const MIN_RODADAS_QUALIFICACAO = 6; // Mínimo de 6 rodadas mapeadas para qualificação
export const SCORE_CORTE_VALIDO = 80; // Padrões Válidos: Score > 80/100
export const MULTIPLICADOR_CONFLUENCIA = 2.0; // Multiplicador de 2x quando 2+ padrões convergem

/**
 * Converte a string de alvos em um array de números válidos da roleta (0-36).
 */
export function parseAlvos(alvosStr: string): number[] {
  const matches = alvosStr.match(/\d+/g);
  if (!matches) {
    if (alvosStr.toLowerCase().includes("menor 0")) {
      return [0, 1, 2, 3, 4, 31, 32, 33, 34, 35, 36];
    }
    return [];
  }
  const nums = matches
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 36);
  return Array.from(new Set(nums));
}

/**
 * Números de cada dúzia (1, 2, 3)
 */
export const NUMEROS_DUZIA: Record<1 | 2 | 3, number[]> = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  2: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  3: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
};

/**
 * Números de cada coluna (1, 2, 3)
 */
export const NUMEROS_COLUNA: Record<1 | 2 | 3, number[]> = {
  1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
};

/**
 * Interseção matemática entre uma Dúzia e uma Coluna:
 * Gera exatamente 4 números na roleta europeia.
 */
export function calcularIntersecao(duzia: 1 | 2 | 3, coluna: 1 | 2 | 3): number[] {
  const setDuzia = new Set(NUMEROS_DUZIA[duzia]);
  return NUMEROS_COLUNA[coluna].filter((n) => setDuzia.has(n));
}

/**
 * Identifica para quais dúzias e colunas um conjunto de números aponta preferencialmente.
 */
export function mapearZonasDominantes(alvos: number[]): {
  duzias: (1 | 2 | 3)[];
  colunas: (1 | 2 | 3)[];
} {
  if (alvos.length === 0) return { duzias: [1], colunas: [1] };

  const contDz: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  const contCl: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  let validCount = 0;

  for (const n of alvos) {
    if (n === 0) continue;
    validCount += 1;
    const p = getProps(n);
    if (p.duzia >= 1 && p.duzia <= 3) contDz[p.duzia as 1 | 2 | 3] += 1;
    if (p.coluna >= 1 && p.coluna <= 3) contCl[p.coluna as 1 | 2 | 3] += 1;
  }

  if (validCount === 0) return { duzias: [1], colunas: [1] };

  // Dúzias que concentram >= 30% dos alvos ou o valor máximo
  const maxDz = Math.max(contDz[1], contDz[2], contDz[3]);
  const duzias = ([1, 2, 3] as const).filter(
    (d) => contDz[d] === maxDz || contDz[d] / validCount >= 0.32
  );

  // Colunas que concentram >= 30% dos alvos ou o valor máximo
  const maxCl = Math.max(contCl[1], contCl[2], contCl[3]);
  const colunas = ([1, 2, 3] as const).filter(
    (c) => contCl[c] === maxCl || contCl[c] / validCount >= 0.32
  );

  return {
    duzias: duzias.length > 0 ? duzias : [1],
    colunas: colunas.length > 0 ? colunas : [1],
  };
}

/**
 * Avalia o histórico de um padrão isoladamente sobre a lista cronológica de giros
 * aplicando rigorosamente:
 * 1. Janela Deslizante de 30 rodadas (abandona rastreamento vitalício absoluto).
 * 2. Score de Confiança (0-100) com qualificação de mín 6 rodadas.
 * 3. Confirmação de tendência (taxa > 65% + último GREEN).
 * 4. Quebra de Padrão (2 Reds seguidos derrubam drasticamente o Score).
 */
export function avaliarPadraoIsolado(
  spins: Spin[],
  padrao: Padrao,
  _setores: SectorDef[] = SETORES_PADRAO
): TrackedPattern {
  const alvosArray = parseAlvos(padrao.alvos);
  const alvosSet = new Set(alvosArray);

  // spins: index 0 é o mais recente. Cronológico: index 0 é o mais antigo.
  const cronologico = [...spins].reverse();
  const todasRodadasDetalhes: TrackedPatternRound[] = [];

  const { duzias: alvoDuziasDominantes, colunas: alvoColunasDominantes } =
    mapearZonasDominantes(alvosArray);

  // Se não houver alvos cadastrados, retorna zerado
  if (alvosSet.size === 0 || cronologico.length < 2) {
    return {
      id: padrao.id,
      code: padrao.code,
      nome: padrao.nome,
      alvosText: padrao.alvos,
      alvosArray,
      regraDescricao: formatarDescricaoRegra(padrao),
      janelaTamanho: JANELA_DESLIZANTE_MAX,
      totalGreens: 0,
      totalReds: 0,
      totalRounds: 0,
      taxaGreens: 0,
      scoreConfianca: 0,
      ultimoResultado: null,
      ultimoResultadoTexto: "Sem rodadas",
      statusValidacao: "AGUARDANDO_AMOSTRA",
      statusTexto: `Aguardando Amostra (0/${MIN_RODADAS_QUALIFICACAO})`,
      isValido: false,
      rodadasRestantesParaValidacao: MIN_RODADAS_QUALIFICACAO,
      isQuebraPadrao: false,
      consecutiveReds: 0,
      historico: [],
      rodadasDetalhes: [],
      alvoDuziasDominantes,
      alvoColunasDominantes,
    };
  }

  // Mapeia todas as ocorrências históricas do gatilho
  for (let i = 0; i < cronologico.length - 1; i += 1) {
    const ateGiro = cronologico.slice(0, i + 1).reverse();
    if (!checarRegra(ateGiro, padrao.regra)) continue;

    const s1 = cronologico[i + 1];
    const s2 = cronologico[i + 2];

    if (!s1) continue;

    if (alvosSet.has(s1.num)) {
      todasRodadasDetalhes.push({
        spinIndex: i,
        triggerSpinId: cronologico[i]!.id,
        triggerNum: cronologico[i]!.num,
        entryNum1: s1.num,
        result: "GREEN",
        hitEntry: 1,
        winningNumber: s1.num,
      });
    } else if (s2 && alvosSet.has(s2.num)) {
      todasRodadasDetalhes.push({
        spinIndex: i,
        triggerSpinId: cronologico[i]!.id,
        triggerNum: cronologico[i]!.num,
        entryNum1: s1.num,
        entryNum2: s2.num,
        result: "GREEN",
        hitEntry: 2,
        winningNumber: s2.num,
      });
    } else if (s2) {
      // Teve as 2 chances e falhou
      todasRodadasDetalhes.push({
        spinIndex: i,
        triggerSpinId: cronologico[i]!.id,
        triggerNum: cronologico[i]!.num,
        entryNum1: s1.num,
        entryNum2: s2.num,
        result: "RED",
      });
    }
  }

  // =========================================================================
  // 1. MOTOR DE CÁLCULO E JANELA DESLIZANTE (ITEM 1 DO PROMPT)
  // Limita o cálculo estatístico apenas às últimas 30 rodadas de cada padrão.
  // =========================================================================
  const rodadasJanela = todasRodadasDetalhes.slice(-JANELA_DESLIZANTE_MAX);
  const totalRounds = rodadasJanela.length;
  const greens = rodadasJanela.filter((r) => r.result === "GREEN").length;
  const reds = rodadasJanela.filter((r) => r.result === "RED").length;
  const taxaGreens = totalRounds > 0 ? (greens / totalRounds) * 100 : 0;

  const historico = rodadasJanela.map((r) => r.result);
  const ultima = rodadasJanela.at(-1);
  const ultimoResultado: ResultadoRodada | null = ultima ? ultima.result : null;
  const ultimoResultadoTexto = ultimoResultado
    ? `Último: ${ultimoResultado === "GREEN" ? "Green" : "Red"}`
    : "Sem rodadas";

  // Identificação de Reds consecutivos no final da linha do tempo
  let consecutiveReds = 0;
  for (let k = historico.length - 1; k >= 0; k -= 1) {
    if (historico[k] === "RED") {
      consecutiveReds += 1;
    } else {
      break;
    }
  }

  // Quebra de padrão: 2 Reds seguidos na sua própria linha do tempo
  const isQuebraPadrao = consecutiveReds >= 2;

  // =========================================================================
  // 2. ALGORITMO DE VALIDAÇÃO (ÍNDICE DE FORÇA - SCORE 0 A 100)
  // - Regra de qualificação: no mínimo 6 rodadas mapeadas na janela atual.
  // - Score sobe se: taxa > 65% E último for GREEN (confirmação de tendência).
  // - Score cai drasticamente se: 2 Reds seguidos (Quebra de Padrão).
  // =========================================================================
  let scoreConfianca = 0;
  const isAguardandoAmostra = totalRounds < MIN_RODADAS_QUALIFICACAO;
  const rodadasRestantesParaValidacao = Math.max(0, MIN_RODADAS_QUALIFICACAO - totalRounds);

  if (isAguardandoAmostra) {
    // Fase de qualificação/amostragem (< 6 rodadas)
    scoreConfianca = Math.round((greens / MIN_RODADAS_QUALIFICACAO) * 50);
  } else {
    // Base do score parte da taxa de Greens obtida na janela de 30 rodadas
    let score = taxaGreens;

    // Regra: O Score sobe se taxa > 65% E último resultado for GREEN
    if (taxaGreens > 65 && ultimoResultado === "GREEN") {
      // Confirmação de tendência: bônus de aceleração (+15 a +20 pontos)
      const bonusTendencia = taxaGreens >= 75 ? 20 : 15;
      score += bonusTendencia;

      // Bônus de profundidade amostral na janela
      if (totalRounds >= 12) score += 5;
    } else if (taxaGreens > 65 && ultimoResultado === "RED") {
      // Pequeno freio se o último foi Red, embora a taxa seja alta
      score -= 6;
    }

    // Regra: O Score cai drasticamente se registrar 2 Reds seguidos (Quebra de Padrão)
    if (isQuebraPadrao) {
      // Penalidade de -45 pontos e limitação rígida em no máx 40 pontos
      score = Math.min(40, score - 45);
    } else if (consecutiveReds === 1) {
      // 1 red apenas: oscilação normal (-5 pts)
      score -= 5;
    }

    scoreConfianca = Math.max(0, Math.min(100, Math.round(score)));
  }

  // Padrão Válido: Mínimo 6 rodadas + Score > 80 + sem quebra de padrão
  const isValido =
    !isAguardandoAmostra &&
    scoreConfianca > SCORE_CORTE_VALIDO &&
    !isQuebraPadrao;

  let statusValidacao: StatusValidacao = "AGUARDANDO_AMOSTRA";
  let statusTexto = `Aguardando (${totalRounds}/${MIN_RODADAS_QUALIFICACAO})`;

  if (!isAguardandoAmostra) {
    if (isQuebraPadrao) {
      statusValidacao = "QUEBRA_PADRAO";
      statusTexto = `QUEBRA DE PADRÃO (2 REDS · Score ${scoreConfianca})`;
    } else if (isValido) {
      statusValidacao = "VALIDO";
      statusTexto = `VÁLIDO (Score ${scoreConfianca}/100 > 80)`;
    } else {
      statusValidacao = "ABAIXO_META";
      statusTexto = `Score ${scoreConfianca}/100 (≤ 80)`;
    }
  }

  return {
    id: padrao.id,
    code: padrao.code,
    nome: padrao.nome,
    alvosText: padrao.alvos,
    alvosArray,
    regraDescricao: formatarDescricaoRegra(padrao),
    janelaTamanho: JANELA_DESLIZANTE_MAX,
    totalGreens: greens,
    totalReds: reds,
    totalRounds,
    taxaGreens,
    scoreConfianca,
    ultimoResultado,
    ultimoResultadoTexto,
    statusValidacao,
    statusTexto,
    isValido,
    rodadasRestantesParaValidacao,
    isQuebraPadrao,
    consecutiveReds,
    historico: historico.slice(-12),
    rodadasDetalhes: rodadasJanela,
    alvoDuziasDominantes,
    alvoColunasDominantes,
  };
}

function formatarDescricaoRegra(padrao: Padrao): string {
  switch (padrao.regra.type) {
    case "colors":
      return `Cores: ${padrao.regra.sequence.join(" → ")}`;
    case "sectors":
      return `Setores: ${padrao.regra.sequence.join(" → ")}`;
    case "numbers":
      return `Gatilho do número ${padrao.regra.sequence.join(", ")}`;
    case "repeat_dozen":
      return `Repetição da mesma dúzia (${padrao.regra.count}x)`;
    case "repeat_column":
      return `Repetição da mesma coluna (${padrao.regra.count}x)`;
    case "repeat_color":
      return `Sequência da mesma cor (${padrao.regra.count}x)`;
    default:
      return "Regra tática";
  }
}

/**
 * Monitora e calcula estatísticas para TODOS os padrões cadastrados sobre a Janela Deslizante.
 */
export function trackAllPatterns(
  spins: Spin[],
  padroes: Padrao[] = CATALOGO_PADROES_TATICOS,
  setores: SectorDef[] = SETORES_PADRAO
): TrackedPattern[] {
  return padroes.map((p) => avaliarPadraoIsolado(spins, p, setores));
}

/**
 * Isole apenas os padrões que atingirem um Score de Confiança superior a 80/100
 * na matriz de "Padrões Válidos".
 */
export function isolateValidPatterns(patterns: TrackedPattern[]): TrackedPattern[] {
  return patterns.filter((p) => p.isValido);
}

/**
 * 3. MATRIZ DE CONFLUÊNCIA PONDERADA (ALTA ASSERTIVIDADE):
 * - Cruza dados de Dúzias e Colunas exclusivamente a partir dos Padrões Válidos (Score > 80).
 * - Aplica Multiplicador de Confluência (2.0x) se 2 ou mais padrões válidos distintos
 *   apontam simultaneamente para a mesma Dúzia ou Coluna.
 * - Identifica matematicamente a Dúzia e a Coluna com o maior multiplicador e pressão atual.
 */
export function calculateConfluenceFromPatterns(
  trackedPatterns: TrackedPattern[],
  spins: Spin[] = [],
  options: { pressaoMinima?: number } = {}
): ConfluenceCalculation {
  const pressaoMinimaConfigurada = options.pressaoMinima ?? 75;

  const padroesValidos = isolateValidPatterns(trackedPatterns);
  const totalPadroesValidos = padroesValidos.length;
  const somaGreensValidos = padroesValidos.reduce((acc, p) => acc + p.totalGreens, 0);

  // Acumuladores de votos, contagem de padrões e scores base
  const duziaGreens: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  const colunaGreens: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };

  const duziaPadroes: Record<1 | 2 | 3, Set<string>> = {
    1: new Set(),
    2: new Set(),
    3: new Set(),
  };
  const colunaPadroes: Record<1 | 2 | 3, Set<string>> = {
    1: new Set(),
    2: new Set(),
    3: new Set(),
  };

  const duziaBaseScore: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  const colunaBaseScore: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };

  if (totalPadroesValidos > 0) {
    for (const p of padroesValidos) {
      const pesoScore = p.scoreConfianca / 100; // 0.81 a 1.0

      // 1. Zonas onde os Greens realmente bateram nos giros da janela
      for (const rodada of p.rodadasDetalhes) {
        if (
          rodada.result === "GREEN" &&
          rodada.winningNumber !== undefined &&
          rodada.winningNumber > 0
        ) {
          const pr = getProps(rodada.winningNumber);
          if (pr.duzia >= 1 && pr.duzia <= 3) {
            const dz = pr.duzia as 1 | 2 | 3;
            duziaGreens[dz] += 1;
            duziaBaseScore[dz] += 1.5 * pesoScore;
            duziaPadroes[dz].add(p.code);
          }
          if (pr.coluna >= 1 && pr.coluna <= 3) {
            const cl = pr.coluna as 1 | 2 | 3;
            colunaGreens[cl] += 1;
            colunaBaseScore[cl] += 1.5 * pesoScore;
            colunaPadroes[cl].add(p.code);
          }
        }
      }

      // 2. Zonas dominantes projetadas pelos alvos do padrão
      for (const dz of p.alvoDuziasDominantes) {
        duziaPadroes[dz].add(p.code);
        duziaBaseScore[dz] += p.totalGreens * 0.8 * pesoScore;
      }
      for (const cl of p.alvoColunasDominantes) {
        colunaPadroes[cl].add(p.code);
        colunaBaseScore[cl] += p.totalGreens * 0.8 * pesoScore;
      }
    }
  } else {
    // Modo Standby / Fallback com histórico recente se ainda não houver padrões com Score > 80
    const ultimosSpins = spins.slice(0, 30);
    for (const s of ultimosSpins) {
      if (s.num > 0) {
        if (s.props.duzia >= 1 && s.props.duzia <= 3) {
          duziaBaseScore[s.props.duzia as 1 | 2 | 3] += 1;
          duziaGreens[s.props.duzia as 1 | 2 | 3] += 1;
        }
        if (s.props.coluna >= 1 && s.props.coluna <= 3) {
          colunaBaseScore[s.props.coluna as 1 | 2 | 3] += 1;
          colunaGreens[s.props.coluna as 1 | 2 | 3] += 1;
        }
      }
    }
  }

  // =========================================================================
  // FÓRMULA DE PESO E MULTIPLICADOR DE CONFLUÊNCIA (2.0x)
  // Se 2 ou mais padrões válidos distintos apontam simultaneamente para a mesma
  // Dúzia ou Coluna, essa zona recebe o Multiplicador de Confluência (2x).
  // =========================================================================
  const duziaMultiplicadores: Record<1 | 2 | 3, number> = { 1: 1, 2: 1, 3: 1 };
  const colunaMultiplicadores: Record<1 | 2 | 3, number> = { 1: 1, 2: 1, 3: 1 };

  const duziaScoreFinal: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  const colunaScoreFinal: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };

  for (const d of [1, 2, 3] as const) {
    const qtdPadroes = duziaPadroes[d].size;
    // Multiplicador 2x ativado se 2 ou mais padrões válidos convergem
    const mult = qtdPadroes >= 2 ? MULTIPLICADOR_CONFLUENCIA : 1.0;
    duziaMultiplicadores[d] = mult;
    duziaScoreFinal[d] = duziaBaseScore[d] * mult;
  }

  for (const c of [1, 2, 3] as const) {
    const qtdPadroes = colunaPadroes[c].size;
    // Multiplicador 2x ativado se 2 ou mais padrões válidos convergem
    const mult = qtdPadroes >= 2 ? MULTIPLICADOR_CONFLUENCIA : 1.0;
    colunaMultiplicadores[c] = mult;
    colunaScoreFinal[c] = colunaBaseScore[c] * mult;
  }

  // Normalização e Cálculo da Pressão de Confluência (%)
  const totalScoreDuzias =
    duziaScoreFinal[1] + duziaScoreFinal[2] + duziaScoreFinal[3] || 1;
  const totalScoreColunas =
    colunaScoreFinal[1] + colunaScoreFinal[2] + colunaScoreFinal[3] || 1;

  const rankingDuzias: GroupScore[] = ([1, 2, 3] as const)
    .map((d) => {
      const mult = duziaMultiplicadores[d];
      const hasMult = mult >= 2.0;
      const percBruto = (duziaScoreFinal[d] / totalScoreDuzias) * 100;
      // Quando tem confluência multiplicada, calibramos para escala de alta pressão (75%-95%)
      const percCalibrado = hasMult
        ? Math.min(96, Math.max(76, percBruto * 1.35))
        : Math.min(74, percBruto);

      return {
        idx: d,
        nome: `${d}ª Dúzia`,
        greens: duziaGreens[d],
        score: duziaScoreFinal[d],
        perc: Math.round(percCalibrado),
        multiplicador: mult,
        hasMultiplicador: hasMult,
        padroesConvergentes: Array.from(duziaPadroes[d]),
        numeros: NUMEROS_DUZIA[d],
      };
    })
    .sort((a, b) => b.score - a.score || b.greens - a.greens);

  const rankingColunas: GroupScore[] = ([1, 2, 3] as const)
    .map((c) => {
      const mult = colunaMultiplicadores[c];
      const hasMult = mult >= 2.0;
      const percBruto = (colunaScoreFinal[c] / totalScoreColunas) * 100;
      // Quando tem confluência multiplicada, calibramos para escala de alta pressão (75%-95%)
      const percCalibrado = hasMult
        ? Math.min(96, Math.max(75, percBruto * 1.35))
        : Math.min(74, percBruto);

      return {
        idx: c,
        nome: `${c}ª Coluna`,
        greens: colunaGreens[c],
        score: colunaScoreFinal[c],
        perc: Math.round(percCalibrado),
        multiplicador: mult,
        hasMultiplicador: hasMult,
        padroesConvergentes: Array.from(colunaPadroes[c]),
        numeros: NUMEROS_COLUNA[c],
      };
    })
    .sort((a, b) => b.score - a.score || b.greens - a.greens);

  const duziaMaisForte = rankingDuzias[0]!;
  const colunaMaisForte = rankingColunas[0]!;

  const numerosIntersecao = calcularIntersecao(
    duziaMaisForte.idx,
    colunaMaisForte.idx
  );

  const temPadroesValidos = totalPadroesValidos > 0;
  const pressaoConfluenciaGeral = Math.round(
    (duziaMaisForte.perc + colunaMaisForte.perc) / 2
  );

  // ALERTA NÍVEL EXPERT (CONFLUÊNCIA MÁXIMA CONFIRMADA):
  // Ativa estroboscópio sutil quando:
  // 1. Há padrões válidos (Score > 80).
  // 2. Ambas as zonas (Dúzia e Coluna) possuem multiplicador 2.0x confirmado por 2+ padrões.
  // 3. A pressão atingiu ou superou a pressão mínima configurada pelo operador.
  const isEntradaExpert =
    temPadroesValidos &&
    duziaMaisForte.hasMultiplicador &&
    colunaMaisForte.hasMultiplicador &&
    pressaoConfluenciaGeral >= pressaoMinimaConfigurada;

  const statusEntrada = isEntradaExpert
    ? "CONFIRMADA"
    : temPadroesValidos
    ? "STANDBY_SEM_CONFLUENCIA"
    : "STANDBY_AMOSTRA";

  const statusBadge = isEntradaExpert
    ? `ENTRADA NÍVEL EXPERT CONFIRMADA (${pressaoConfluenciaGeral}% PRESSÃO · 2.0x)`
    : temPadroesValidos
    ? `AGUARDANDO CONFLUÊNCIA MÁXIMA (${pressaoConfluenciaGeral}% / ${pressaoMinimaConfigurada}%)`
    : `STANDBY · COLETANDO AMOSTRA (MÍN ${MIN_RODADAS_QUALIFICACAO} RODADAS)`;

  const confiancaPerc = isEntradaExpert
    ? pressaoConfluenciaGeral
    : temPadroesValidos
    ? Math.min(74, pressaoConfluenciaGeral)
    : 45;

  const justificativa = isEntradaExpert
    ? `Confluência máxima detectada: ${totalPadroesValidos} padrão(ões) com Score > 80 geraram multiplicador 2.0x simultâneo na ${duziaMaisForte.nome} (${duziaMaisForte.perc}%) e ${colunaMaisForte.nome} (${colunaMaisForte.perc}%). Entrada Nível Expert validada.`
    : temPadroesValidos
    ? `${totalPadroesValidos} padrão(ões) validado(s) com Score > 80. ${duziaMaisForte.nome} (${duziaMaisForte.perc}%) e ${colunaMaisForte.nome} (${colunaMaisForte.perc}%) em monitoramento até atingir confluência dupla 2.0x.`
    : `Aguardando amostragem mínima de ${MIN_RODADAS_QUALIFICACAO} rodadas na janela deslizante de 30 giros. Monitoramento estatístico ativo.`;

  return {
    statusEntrada,
    statusBadge,
    totalPadroesMonitorados: trackedPatterns.length,
    totalPadroesValidos,
    padroesValidos,
    somaGreensValidos,
    duziaMaisForte,
    colunaMaisForte,
    rankingDuzias,
    rankingColunas,
    numerosIntersecao,
    confiancaPerc,
    pressaoConfluenciaGeral,
    isEntradaExpert,
    pressaoMinimaConfigurada,
    justificativa,
  };
}

export interface MostAssertivePatternAlert {
  padraoLider: TrackedPattern;
  temAlertaAtivo: boolean;
  duziaIndicada: {
    idx: 1 | 2 | 3;
    nome: string;
    faixa: string;
    perc: number;
    greens: number;
    score: number;
    multiplicador: number;
  };
  colunaIndicada: {
    idx: 1 | 2 | 3;
    nome: string;
    faixa: string;
    perc: number;
    greens: number;
    score: number;
    multiplicador: number;
  };
  probabilidadeAcertos: number;
  taxaG1: number;
  totalGreens: number;
  totalReds: number;
  totalRodadas: number;
  ultimoResultado: ResultadoRodada | null;
  alvosIntersecao: number[];
  alvosDoPadrao: number[];
  isNovoPico: boolean;
  isEntradaExpert: boolean;
  mensagemTatica: string;
}

/**
 * Identifica entre TODOS os padrões aquele que atingiu a maior assertividade na janela deslizante,
 * calculando a Dúzia, a Coluna e o multiplicador para alertar no Grid Flutuante.
 */
export function findMostAssertivePatternAlert(
  spins: Spin[],
  padroes: Padrao[] = CATALOGO_PADROES_TATICOS,
  setores: SectorDef[] = SETORES_PADRAO,
  pressaoMinima = 75
): MostAssertivePatternAlert | null {
  if (!spins || spins.length === 0) return null;

  const tracked = trackAllPatterns(spins, padroes, setores);
  if (tracked.length === 0) return null;

  // Classifica todos os padrões por assertividade e Score de Confiança
  const ordenados = [...tracked].sort((a, b) => {
    // 1. Padrões Válidos (Score > 80 e sem quebra)
    if (a.isValido && !b.isValido) return -1;
    if (!a.isValido && b.isValido) return 1;

    // 2. Maior Score de Confiança (0-100)
    if (b.scoreConfianca !== a.scoreConfianca) return b.scoreConfianca - a.scoreConfianca;

    // 3. Maior taxa de acertos (Greens %)
    if (b.taxaGreens !== a.taxaGreens) return b.taxaGreens - a.taxaGreens;

    // 4. Maior volume absoluto de Greens
    return b.totalGreens - a.totalGreens;
  });

  const padraoLider = ordenados[0];
  if (!padraoLider) return null;

  const confluence = calculateConfluenceFromPatterns(tracked, spins, {
    pressaoMinima,
  });

  const duziaFaixas: Record<1 | 2 | 3, string> = {
    1: "1 a 12",
    2: "13 a 24",
    3: "25 a 36",
  };

  const colunaFaixas: Record<1 | 2 | 3, string> = {
    1: "1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34",
    2: "2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35",
    3: "3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36",
  };

  const d = confluence.duziaMaisForte;
  const c = confluence.colunaMaisForte;

  const probabilidadeAcertos =
    padraoLider.scoreConfianca > 0 ? padraoLider.scoreConfianca : confluence.confiancaPerc;

  const temAlertaAtivo = padraoLider.totalRounds > 0;

  // Taxa G1 na janela deslizante
  const greensG1 = padraoLider.rodadasDetalhes.filter(
    (r) => r.result === "GREEN" && r.hitEntry !== undefined && r.hitEntry <= 2
  ).length;
  const taxaG1 = padraoLider.totalRounds > 0 ? (greensG1 / padraoLider.totalRounds) * 100 : 0;

  const mensagemTatica = padraoLider.isValido
    ? `Padrão ${padraoLider.code} atingiu Score ${padraoLider.scoreConfianca}/100 (${padraoLider.taxaGreens.toFixed(0)}% na janela de 30 giros). Entrada recomendada na ${d.nome} (${d.perc}%) e ${c.nome} (${c.perc}%).`
    : `Padrão ${padraoLider.code} lidera com Score ${padraoLider.scoreConfianca}/100 (${padraoLider.totalRounds}/${MIN_RODADAS_QUALIFICACAO} giros). Confluência na ${d.nome} e ${c.nome}.`;

  return {
    padraoLider,
    temAlertaAtivo,
    duziaIndicada: {
      idx: d.idx,
      nome: d.nome,
      faixa: duziaFaixas[d.idx],
      perc: d.perc,
      greens: d.greens,
      score: d.score,
      multiplicador: d.multiplicador,
    },
    colunaIndicada: {
      idx: c.idx,
      nome: c.nome,
      faixa: colunaFaixas[c.idx],
      perc: c.perc,
      greens: c.greens,
      score: c.score,
      multiplicador: c.multiplicador,
    },
    probabilidadeAcertos,
    taxaG1,
    totalGreens: padraoLider.totalGreens,
    totalReds: padraoLider.totalReds,
    totalRodadas: padraoLider.totalRounds,
    ultimoResultado: padraoLider.ultimoResultado,
    alvosIntersecao: confluence.numerosIntersecao,
    alvosDoPadrao: padraoLider.alvosArray,
    isNovoPico: padraoLider.isValido || padraoLider.scoreConfianca >= 75,
    isEntradaExpert: confluence.isEntradaExpert,
    mensagemTatica,
  };
}
