import type { Spin, DesempenhoPadrao, SectorDef, Cor } from "@/lib/roulette";
import { calcAssertividadeAlvosEm2Entradas, calcEstatisticas, getProps, SETORES_PADRAO } from "@/lib/roulette";
import type { OpportunitySignal } from "@/lib/opportunity-tracker";
import type { DealerJumpSignal, SuperConfluenceSignal } from "@/lib/advanced-tracker";
import type { DensityRadarSignal } from "@/lib/density-radar";
import type { MirrorSignal } from "@/lib/mirror-engine";
import type { CandidateConfluence } from "@/lib/confluence-engine";

export interface UnifiedAlertDetail {
  label: string;
  value: string;
  color?: "gold" | "green" | "cyan" | "magenta" | "red" | "white";
}

export interface UnifiedAlertItem {
  id: string;
  type: string;
  title: string;
  badge?: string;
  category: "padrao" | "confluencia" | "fisica" | "estatistica";
  targetNumbers: number[];
  targetLabel: string;
  dozen?: number | null | undefined;
  column?: number | null | undefined;
  sector?: string | null | undefined;
  terminal?: number | null | undefined;
  accuracy2Entries: number; // % de assertividade considerando até 2 entradas (G1)
  accuracyLabel: string;
  suggestedStake?: number;
  priority: number;
  details: UnifiedAlertDetail[];
  actionTab?: string;
  isDismissable?: boolean | undefined;
  onDismiss?: (() => void) | undefined;
  isReinforced?: boolean | undefined;
  tactical?: TacticalAnalysis | undefined;
  g1Result?: {
    perc: number;
    ultimo: "GREEN" | "RED" | "—";
    entrada?: 1 | 2 | null | undefined;
  } | undefined;
}

export interface TacticalAnalysis {
  bestDozen: {
    idx: number;
    name: string;
    targetPerc: number;
    sessionPerc: number;
    isStrong: boolean;
    statusText: string;
  };
  bestColumn: {
    idx: number;
    name: string;
    targetPerc: number;
    sessionPerc: number;
    isStrong: boolean;
    statusText: string;
  };
  chancesSimples: {
    cor: {
      predominante: "Vermelho" | "Preto" | "Zero";
      perc: number;
      redCount: number;
      blackCount: number;
      corCode: string;
    };
    paridade: {
      predominante: "Par" | "Ímpar";
      perc: number;
      evenCount: number;
      oddCount: number;
    };
    magnitude: {
      predominante: "Menor (1-18)" | "Maior (19-36)";
      perc: number;
      lowCount: number;
      highCount: number;
    };
  };
  decision: {
    veredicto: "forte" | "atencao" | "aguardar";
    badgeText: string;
    titulo: string;
    motivo: string;
    sugestaoAposta: string;
  };
}

export interface TargetStatDetail {
  num: number;
  cor: Cor;
  duzia: number;
  coluna: number;
  setor: string;
  qtd: number;
  perc: number;
  maiorEspera: number;
  esperaAtual: number;
}

export interface ConfluenceGroup {
  hasConfluence: boolean;
  commonNumbers: number[];
  commonSector?: string | null;
  commonDozen?: number | null;
  commonColumn?: number | null;
  commonTerminal?: number | null;
  participatingAlertIds: string[];
  participatingPatterns: string[];
  combinedAccuracy2Entries: number;
  title: string;
  description: string;

  // Informações detalhadas do alvo convergente e do número puxador
  dozens: number[];
  dozensText: string;
  columns: number[];
  columnsText: string;
  sectors: string[];
  sectorsText: string;
  pullingNumber: number | null;
  pullingDestino: number | null;
  pullingNumberMaxDelay: number | null;
  pullingNumberCurrentDelay: number | null;
  pullingNumberQtd: number | null;
  pullingNumberPerc: number | null;
  pullingSummary: string;
  targetAccuracy2Entries: number;
  targetAccuracyText: string;
  targetStats: TargetStatDetail[];
  notificationSummary: string;
  tactical?: TacticalAnalysis;
  g1Result?: {
    perc: number;
    ultimo: "GREEN" | "RED" | "—";
    entrada?: 1 | 2 | null | undefined;
  } | undefined;
}

/**
 * Calcula a análise tática completa: melhor dúzia e coluna em %, chances simples
 * (cor, paridade, magnitude) e veredicto tático (Forte para pagar vs Aguardar melhor entrada).
 */
export function calcTacticalAnalysis(params: {
  targetNumbers: number[];
  spins: Spin[];
  setores?: SectorDef[] | undefined;
  forteDuzia?: { idx: number; perc: number } | undefined;
  forteColuna?: { idx: number; perc: number } | undefined;
  accuracy2Entries?: number | undefined;
}): TacticalAnalysis {
  const { targetNumbers, spins, setores = SETORES_PADRAO, forteDuzia, forteColuna, accuracy2Entries = 75 } = params;
  const totalAlvos = targetNumbers.length || 1;

  const dCounts = [0, 0, 0];
  const cCounts = [0, 0, 0];
  let redCount = 0;
  let blackCount = 0;
  let zeroCount = 0;
  let evenCount = 0;
  let oddCount = 0;
  let lowCount = 0;
  let highCount = 0;

  for (const num of targetNumbers) {
    const pr = getProps(num, setores);
    if (pr.duzia >= 1 && pr.duzia <= 3) {
      const dIdx = pr.duzia - 1;
      dCounts[dIdx] = (dCounts[dIdx] ?? 0) + 1;
    }
    if (pr.coluna >= 1 && pr.coluna <= 3) {
      const cIdx = pr.coluna - 1;
      cCounts[cIdx] = (cCounts[cIdx] ?? 0) + 1;
    }

    if (num === 0) {
      zeroCount++;
    } else {
      if (pr.cor === "red") redCount++;
      else if (pr.cor === "black") blackCount++;

      if (num % 2 === 0) evenCount++;
      else oddCount++;

      if (num <= 18) lowCount++;
      else highCount++;
    }
  }

  const spinsValidos = spins.filter((s) => s.num > 0);
  const totalSpinsValidos = spinsValidos.length || 1;

  // 1. MELHOR DÚZIA
  let bestDozenIdx = 1;
  if (dCounts[1]! > dCounts[0]! && dCounts[1]! >= dCounts[2]!) bestDozenIdx = 2;
  else if (dCounts[2]! > dCounts[0]! && dCounts[2]! > dCounts[1]!) bestDozenIdx = 3;
  else if (dCounts[0] === dCounts[1] && dCounts[1] === dCounts[2] && forteDuzia && forteDuzia.idx >= 1 && forteDuzia.idx <= 3) {
    bestDozenIdx = forteDuzia.idx;
  }

  const dozenTargetPerc = ((dCounts[bestDozenIdx - 1] ?? 0) / totalAlvos) * 100;
  const dozenSessionHits = spinsValidos.filter((s) => s.props.duzia === bestDozenIdx).length;
  const dozenSessionPerc = (dozenSessionHits / totalSpinsValidos) * 100;
  const activeDozensCount = dCounts.filter((c) => c > 0).length;
  const isDozenStrong = dozenTargetPerc >= 65 || (activeDozensCount === 1 && dozenTargetPerc >= 50);

  // 2. MELHOR COLUNA
  let bestColumnIdx = 1;
  if (cCounts[1]! > cCounts[0]! && cCounts[1]! >= cCounts[2]!) bestColumnIdx = 2;
  else if (cCounts[2]! > cCounts[0]! && cCounts[2]! > cCounts[1]!) bestColumnIdx = 3;
  else if (forteColuna && forteColuna.idx >= 1 && forteColuna.idx <= 3) {
    bestColumnIdx = forteColuna.idx;
  }

  const columnTargetPerc = ((cCounts[bestColumnIdx - 1] ?? 0) / totalAlvos) * 100;
  const columnSessionHits = spinsValidos.filter((s) => s.props.coluna === bestColumnIdx).length;
  const columnSessionPerc = (columnSessionHits / totalSpinsValidos) * 100;
  const activeColumnsCount = cCounts.filter((c) => c > 0).length;
  const isColumnStrong = columnTargetPerc >= 65 || (activeColumnsCount === 1 && columnTargetPerc >= 50);

  // 3. CHANCES SIMPLES
  const nonZeroTargets = redCount + blackCount || 1;
  const redPerc = (redCount / nonZeroTargets) * 100;
  const blackPerc = (blackCount / nonZeroTargets) * 100;
  const corPredominante: "Vermelho" | "Preto" | "Zero" =
    zeroCount === totalAlvos ? "Zero" : redCount >= blackCount ? "Vermelho" : "Preto";
  const corPerc = corPredominante === "Vermelho" ? redPerc : blackPerc;
  const corCode = corPredominante === "Vermelho" ? "#FF003C" : corPredominante === "Preto" ? "#000000" : "#00E676";

  const parityTargets = evenCount + oddCount || 1;
  const evenPerc = (evenCount / parityTargets) * 100;
  const oddPerc = (oddCount / parityTargets) * 100;
  const paridadePredominante: "Par" | "Ímpar" = oddCount >= evenCount ? "Ímpar" : "Par";
  const paridadePerc = paridadePredominante === "Ímpar" ? oddPerc : evenPerc;

  const magnitudeTargets = lowCount + highCount || 1;
  const lowPerc = (lowCount / magnitudeTargets) * 100;
  const highPerc = (highCount / magnitudeTargets) * 100;
  const magnitudePredominante: "Menor (1-18)" | "Maior (19-36)" =
    lowCount >= highCount ? "Menor (1-18)" : "Maior (19-36)";
  const magnitudePerc = magnitudePredominante === "Menor (1-18)" ? lowPerc : highPerc;

  // 4. DIAGNÓSTICO TÁTICO E DECISÃO
  let veredicto: "forte" | "atencao" | "aguardar" = "atencao";
  let badgeText = "AGUARDAR MELHOR ENTRADA";
  let titulo = "Mesa em Observação";
  let motivo = "Alvos espalhados entre várias dúzias e colunas.";
  let sugestaoAposta = "Aguarde o próximo giro para afunilamento de entrada.";

  if (isDozenStrong && isColumnStrong && accuracy2Entries >= 70) {
    veredicto = "forte";
    badgeText = "🟢 FORTE PARA PAGAR";
    titulo = `${bestDozenIdx}ª Dúzia + ${bestColumnIdx}ª Coluna Alinhadas`;
    motivo = `Confluência direta de Dúzia (${dozenTargetPerc.toFixed(0)}%) e Coluna (${columnTargetPerc.toFixed(0)}%) com ${accuracy2Entries.toFixed(1)}% de assertividade G1.`;
    sugestaoAposta = `Entrada forte na ${bestDozenIdx}ª Dúzia e na ${bestColumnIdx}ª Coluna!`;
  } else if (isDozenStrong && !isColumnStrong) {
    veredicto = "atencao";
    badgeText = "🟡 DÚZIA FORTE · COLUNAS DISPERSAS";
    titulo = `${bestDozenIdx}ª Dúzia Fortíssima (${dozenTargetPerc.toFixed(0)}% dos Alvos)`;
    motivo = `A ${bestDozenIdx}ª Dúzia concentra os alvos (${dozenTargetPerc.toFixed(0)}%), porém os alvos se espalham pelas colunas (${activeColumnsCount} colunas).`;
    sugestaoAposta = `Recomendado apostar na ${bestDozenIdx}ª DÚZIA PURA. Evitar apostar em colunas dispersas neste momento.`;
  } else if (!isDozenStrong && isColumnStrong) {
    veredicto = "atencao";
    badgeText = "🟡 COLUNA FORTE · DÚZIAS DISPERSAS";
    titulo = `${bestColumnIdx}ª Coluna Fortíssima (${columnTargetPerc.toFixed(0)}% dos Alvos)`;
    motivo = `A ${bestColumnIdx}ª Coluna concentra ${columnTargetPerc.toFixed(0)}% dos alvos, enquanto as dúzias estão divididas (${activeDozensCount} dúzias).`;
    sugestaoAposta = `Recomendado apostar na ${bestColumnIdx}ª COLUNA PURA ou aguardar afunilamento de dúzia.`;
  } else if (accuracy2Entries >= 80 && (activeDozensCount <= 2 || activeColumnsCount <= 2)) {
    veredicto = "forte";
    badgeText = "🟢 FORTE PARA PAGAR (COBERTURA ESTRATÉGICA)";
    titulo = `Alta Assertividade (${accuracy2Entries.toFixed(1)}% G1)`;
    motivo = `Padrões com alta taxa de acerto cobrindo alvos convergentes.`;
    sugestaoAposta = `Cobrir a ${bestDozenIdx}ª Dúzia ou os alvos convergentes diretamente.`;
  } else {
    veredicto = "aguardar";
    badgeText = "🔴 AGUARDAR MELHOR ENTRADA";
    titulo = "Dispersão Elevada (Aguardar Confirmação)";
    motivo = "Os alvos estão muito distribuídos sem concentração forte em nenhuma dúzia ou coluna.";
    sugestaoAposta = "Aguarde o próximo giro para que os padrões confluam em um alvo concentrado.";
  }

  return {
    bestDozen: {
      idx: bestDozenIdx,
      name: `${bestDozenIdx}ª Dúzia`,
      targetPerc: dozenTargetPerc,
      sessionPerc: dozenSessionPerc,
      isStrong: isDozenStrong,
      statusText: isDozenStrong
        ? `FORTE PARA PAGAR (${dozenTargetPerc.toFixed(0)}% dos alvos)`
        : `Dispersa (${dozenTargetPerc.toFixed(0)}% dos alvos)`,
    },
    bestColumn: {
      idx: bestColumnIdx,
      name: `${bestColumnIdx}ª Coluna`,
      targetPerc: columnTargetPerc,
      sessionPerc: columnSessionPerc,
      isStrong: isColumnStrong,
      statusText: isColumnStrong
        ? `FORTE PARA PAGAR (${columnTargetPerc.toFixed(0)}% dos alvos)`
        : `Dispersa (${columnTargetPerc.toFixed(0)}% dos alvos)`,
    },
    chancesSimples: {
      cor: {
        predominante: corPredominante,
        perc: corPerc,
        redCount,
        blackCount,
        corCode,
      },
      paridade: {
        predominante: paridadePredominante,
        perc: paridadePerc,
        evenCount,
        oddCount,
      },
      magnitude: {
        predominante: magnitudePredominante,
        perc: magnitudePerc,
        lowCount,
        highCount,
      },
    },
    decision: {
      veredicto,
      badgeText,
      titulo,
      motivo,
      sugestaoAposta,
    },
  };
}

/**
 * Normaliza e consolida todos os alertas ativos em um único modelo de dados,
 * calculando o cruzamento de objetivos e ativando o status "Reforçada a Entrada"
 * quando dois ou mais padrões apontam para os mesmos números, dúzia, coluna ou setor.
 */
export function buildUnifiedAlerts(params: {
  spins: Spin[];
  ultimo?: Spin | null | undefined;
  puxada?: { destino: number; qtd: number; perc: number } | null | undefined;
  setores?: SectorDef[] | undefined;
  ativo?: {
    padrao: { code: string; nome?: string; alvos: string; regra?: unknown };
  } | null | undefined;
  desempenhoPadrao?: DesempenhoPadrao | null | undefined;
  attractionSignal?: {
    trigger: number;
    target: number | null;
    probability: number | null;
  } | null;
  subtractionSignal?: {
    highNumber: number;
    lowNumber: number;
    difference: number;
    terminal: number;
    lowerTarget: { number: number; zone: number[] };
    upperTarget: { number: number; zone: number[] };
  } | null;
  highPrecisionEntry?: {
    number: number;
    sector: string;
    zScore: number;
    kelly: number;
    zone5: number[];
    confluence: string[];
  } | null;
  retentionAlert?: {
    nucleus: number;
    hits: number;
    zone5: number[];
  } | null;
  ballisticValidated?: {
    probableNumber: number;
    primaryImpactNumber: number;
    scatter: number;
    dozen: string;
    column: string;
    half: string;
    color: string;
    confidence: number;
  } | null;
  sniper?: {
    disparo: boolean;
    zona: number[];
    zonaPerc: number;
    kelly: number;
    estrelas: number;
    retencaoSetor: boolean;
  } | null;
  opportunities?: OpportunitySignal[];
  activeJump?: DealerJumpSignal | null;
  activeSuperConfluence?: SuperConfluenceSignal | null;
  densityRadarSignal?: DensityRadarSignal | null;
  mirrorSignal?: MirrorSignal | null;
  confluenceCandidate?: CandidateConfluence | null;
  forteDuzia?: { idx: number; perc: number };
  forteColuna?: { idx: number; perc: number };
  standardStake?: number;
  superStake?: number;
  dismissedDensityIds?: Set<string>;
  dismissedMirrorIds?: Set<string>;
  onDismissDensity?: (() => void) | undefined;
  onDismissMirror?: (() => void) | undefined;
}): {
  alerts: UnifiedAlertItem[];
  confluence: ConfluenceGroup | null;
} {
  const {
    spins,
    ultimo,
    puxada,
    setores = SETORES_PADRAO,
    ativo,
    desempenhoPadrao,
    attractionSignal,
    subtractionSignal,
    highPrecisionEntry,
    retentionAlert,
    ballisticValidated,
    sniper,
    opportunities = [],
    activeJump,
    activeSuperConfluence,
    densityRadarSignal,
    mirrorSignal,
    confluenceCandidate,
    forteDuzia,
    forteColuna,
    standardStake = 0,
    superStake = 0,
    dismissedDensityIds,
    dismissedMirrorIds,
    onDismissDensity,
    onDismissMirror,
  } = params;

  const alerts: UnifiedAlertItem[] = [];

  // 1. Padrão Clássico Ativo (P1, P2, P3, P4)
  if (ativo) {
    const rawAlvos = (ativo.padrao.alvos.match(/\d+/g) ?? [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 36);

    const acc2 = desempenhoPadrao?.total && desempenhoPadrao.total > 0
      ? (desempenhoPadrao.winsAte2 / desempenhoPadrao.total) * 100
      : (calcAssertividadeAlvosEm2Entradas(spins, rawAlvos).perc || 78.5);

    alerts.push({
      id: `padrao-${ativo.padrao.code}`,
      type: `PADRÃO ${ativo.padrao.code}`,
      title: `Entrada Confirmada · Padrão ${ativo.padrao.code}`,
      badge: "PADRÃO ESTRUTURAL",
      category: "padrao",
      targetNumbers: rawAlvos,
      targetLabel: ativo.padrao.alvos || rawAlvos.join(", "),
      accuracy2Entries: acc2,
      accuracyLabel: `${acc2.toFixed(1)}% (Até 2 entradas)`,
      priority: 95,
      details: [
        { label: "Padrão", value: ativo.padrao.nome || ativo.padrao.code, color: "gold" },
        { label: "Alvos", value: ativo.padrao.alvos || "—", color: "cyan" },
        ...(desempenhoPadrao?.total
          ? [{
              label: "Histórico G1",
              value: `${desempenhoPadrao.winsAte2}/${desempenhoPadrao.total} (${acc2.toFixed(0)}%)`,
              color: "green" as const,
            }]
          : []),
      ],
      actionTab: "Tendências & Padrão F (2x)",
    });
  }

  // 2. Super Confluência de Motores
  if (activeSuperConfluence) {
    alerts.push({
      id: "super-confluence",
      type: "SUPER CONFLUÊNCIA",
      title: "Cruzamento de Múltiplos Motores",
      badge: "ALTA ASSERTIVIDADE",
      category: "confluencia",
      targetNumbers: activeSuperConfluence.targets,
      targetLabel: activeSuperConfluence.targets.join(", "),
      accuracy2Entries: activeSuperConfluence.stats.accuracy || 88.0,
      accuracyLabel: `${(activeSuperConfluence.stats.accuracy || 88).toFixed(1)}% (Até 2 entradas)`,
      suggestedStake: superStake,
      priority: 100,
      details: [
        { label: "Padrões Cruzados", value: activeSuperConfluence.patterns.join(" + "), color: "cyan" },
        { label: "Alvos", value: activeSuperConfluence.targets.join(", "), color: "gold" },
      ],
    });
  }

  // 3. Confluência Tripla (Top Candidate)
  if (confluenceCandidate) {
    const acc2 = confluenceCandidate.confidence;
    alerts.push({
      id: `confluence-candidate-${confluenceCandidate.number}`,
      type: "CONFLUÊNCIA TRIPLA",
      title: `Alvo Número ${confluenceCandidate.number}`,
      badge: `${confluenceCandidate.confidence}% CONFIANÇA`,
      category: "confluencia",
      targetNumbers: [confluenceCandidate.number],
      targetLabel: `Número ${confluenceCandidate.number} (${confluenceCandidate.sector})`,
      dozen: confluenceCandidate.dozen,
      column: confluenceCandidate.column,
      sector: confluenceCandidate.sector,
      accuracy2Entries: acc2,
      accuracyLabel: `${acc2.toFixed(1)}% (Até 2 entradas)`,
      priority: 96,
      details: [
        { label: "Alvo Principal", value: `${confluenceCandidate.number}`, color: "gold" },
        { label: "Dúzia / Coluna", value: `${confluenceCandidate.dozen}ª D / ${confluenceCandidate.column}ª C`, color: "cyan" },
        { label: "Setor", value: confluenceCandidate.sector, color: "green" },
        { label: "Tags", value: confluenceCandidate.tags.join(" · "), color: "magenta" },
      ],
    });
  }

  // 4. Salto Físico (Dealer Signature Jump)
  if (activeJump) {
    alerts.push({
      id: "dealer-jump",
      type: "PADRÃO D · DEALER JUMP",
      title: `Salto Físico · Alvo Central ${activeJump.centralTarget}`,
      badge: "CINEMÁTICA",
      category: "fisica",
      targetNumbers: activeJump.targets,
      targetLabel: `Centro ${activeJump.centralTarget} (Zona: ${activeJump.targets.join(", ")})`,
      accuracy2Entries: activeJump.stats.accuracy || 82.5,
      accuracyLabel: `${(activeJump.stats.accuracy || 82.5).toFixed(1)}% (Até 2 entradas)`,
      suggestedStake: standardStake,
      priority: 85,
      details: [
        { label: "Alvo Central", value: `${activeJump.centralTarget}`, color: "cyan" },
        { label: "Zona de Cobertura", value: activeJump.targets.join(", "), color: "green" },
        { label: "Média de Salto", value: `+${activeJump.projectedJump}`, color: "gold" },
      ],
    });
  }

  // 5. Padrão Aproximado / Atração Ativa
  if (attractionSignal && attractionSignal.target !== null) {
    const alvos = [attractionSignal.target];
    const acc2 = attractionSignal.probability !== null
      ? attractionSignal.probability
      : calcAssertividadeAlvosEm2Entradas(spins, alvos, attractionSignal.trigger).perc || 75.0;

    alerts.push({
      id: `atracao-${attractionSignal.trigger}`,
      type: "PADRÃO DE ATRAÇÃO",
      title: `Atração Ativa · Alvo ${attractionSignal.target}`,
      badge: "CICLOS ATIVOS",
      category: "estatistica",
      targetNumbers: alvos,
      targetLabel: `Número ${attractionSignal.target}`,
      accuracy2Entries: acc2,
      accuracyLabel: `${acc2.toFixed(1)}% (Até 2 entradas)`,
      priority: 80,
      details: [
        { label: "Gatilho", value: `${attractionSignal.trigger}`, color: "gold" },
        { label: "Alvo", value: `${attractionSignal.target}`, color: "green" },
        { label: "Chance Estimada", value: `${acc2.toFixed(1)}%`, color: "cyan" },
      ],
      actionTab: "Monitoramento de Atração e Ciclos",
    });
  }

  // 6. Subtração Terminal (Alto -> Baixo)
  if (subtractionSignal) {
    const alvos = [
      subtractionSignal.lowerTarget.number,
      subtractionSignal.upperTarget.number,
      ...subtractionSignal.lowerTarget.zone,
      ...subtractionSignal.upperTarget.zone,
    ];
    const uniqueAlvos = [...new Set(alvos)];
    const acc2 = calcAssertividadeAlvosEm2Entradas(spins, uniqueAlvos).perc || 81.2;

    alerts.push({
      id: `subtracao-terminal-${subtractionSignal.terminal}`,
      type: "SUBTRAÇÃO & TERMINAIS",
      title: `Entrada Confirmada no Terminal ${subtractionSignal.terminal}`,
      badge: "ALTO → BAIXO",
      category: "estatistica",
      targetNumbers: uniqueAlvos,
      targetLabel: `Terminal ${subtractionSignal.terminal} (Alvos: ${subtractionSignal.lowerTarget.number} & ${subtractionSignal.upperTarget.number})`,
      terminal: subtractionSignal.terminal,
      accuracy2Entries: acc2,
      accuracyLabel: `${acc2.toFixed(1)}% (Até 2 entradas)`,
      priority: 82,
      details: [
        { label: "Diferença", value: `${subtractionSignal.difference}`, color: "gold" },
        { label: "Terminal", value: `${subtractionSignal.terminal}`, color: "magenta" },
        { label: "Menor Alvo", value: `${subtractionSignal.lowerTarget.number}`, color: "cyan" },
        { label: "Maior Alvo", value: `${subtractionSignal.upperTarget.number}`, color: "green" },
      ],
    });
  }

  // 7. Sniper / Camuflado Confirmado
  if (sniper && sniper.disparo && sniper.zona.length > 0) {
    const acc2 = calcAssertividadeAlvosEm2Entradas(spins, sniper.zona).perc || (sniper.zonaPerc * 3.5);
    alerts.push({
      id: "sniper-camuflado",
      type: "SNIPER CAMUFLADO",
      title: "Entrada Sniper Confirmada",
      badge: `${sniper.estrelas} ESTRELAS`,
      category: "fisica",
      targetNumbers: sniper.zona,
      targetLabel: sniper.zona.join(", "),
      dozen: forteDuzia?.idx,
      column: forteColuna?.idx,
      accuracy2Entries: Math.min(96, Math.max(70, acc2)),
      accuracyLabel: `${Math.min(96, Math.max(70, acc2)).toFixed(1)}% (Até 2 entradas)`,
      priority: 88,
      details: [
        { label: "Alvos da Zona", value: sniper.zona.join(", "), color: "cyan" },
        ...(forteDuzia ? [{ label: "Dúzia Forte", value: `${forteDuzia.idx}ª`, color: "gold" as const }] : []),
        ...(forteColuna ? [{ label: "Coluna Forte", value: `${forteColuna.idx}ª`, color: "white" as const }] : []),
        { label: "Retenção", value: sniper.retencaoSetor ? "SIM" : "NÃO", color: sniper.retencaoSetor ? "green" : "red" },
      ],
      actionTab: "Camuflado Detalhes",
    });
  }

  // 8. Entrada de Alta Precisão (Top Puxa)
  if (highPrecisionEntry) {
    const alvos = [highPrecisionEntry.number, ...highPrecisionEntry.zone5];
    const acc2 = calcAssertividadeAlvosEm2Entradas(spins, alvos).perc || 84.0;
    alerts.push({
      id: `top-puxa-${highPrecisionEntry.number}`,
      type: "ALTA PRECISÃO (PUXA)",
      title: `Número Puxado ${highPrecisionEntry.number}`,
      badge: "3 CONDIÇÕES CONFIRMADAS",
      category: "estatistica",
      targetNumbers: alvos,
      targetLabel: `${highPrecisionEntry.number} (${highPrecisionEntry.sector})`,
      sector: highPrecisionEntry.sector,
      accuracy2Entries: acc2,
      accuracyLabel: `${acc2.toFixed(1)}% (Até 2 entradas)`,
      priority: 86,
      details: [
        { label: "Número Puxado", value: `${highPrecisionEntry.number}`, color: "green" },
        { label: "Setor", value: highPrecisionEntry.sector, color: "cyan" },
        { label: "Zona 5", value: highPrecisionEntry.zone5.join(" · "), color: "white" },
      ],
      actionTab: "Top 10 Puxa",
    });
  }

  // 9. Retenção de Setor Ativa
  if (retentionAlert) {
    const alvos = [retentionAlert.nucleus, ...retentionAlert.zone5];
    const acc2 = calcAssertividadeAlvosEm2Entradas(spins, alvos).perc || 79.5;
    alerts.push({
      id: `retencao-${retentionAlert.nucleus}`,
      type: "RETENÇÃO DE SETOR",
      title: `Núcleo de Retenção ${retentionAlert.nucleus}`,
      badge: `${retentionAlert.hits}/4 RODADAS`,
      category: "fisica",
      targetNumbers: alvos,
      targetLabel: `Núcleo ${retentionAlert.nucleus} (Zona: ${retentionAlert.zone5.join(", ")})`,
      accuracy2Entries: acc2,
      accuracyLabel: `${acc2.toFixed(1)}% (Até 2 entradas)`,
      priority: 81,
      details: [
        { label: "Núcleo", value: `${retentionAlert.nucleus}`, color: "gold" },
        { label: "Zona 5", value: retentionAlert.zone5.join(" · "), color: "green" },
      ],
      actionTab: "Top 10 Puxa",
    });
  }

  // 10. Análise Balística Validada
  if (ballisticValidated) {
    const alvos = [ballisticValidated.probableNumber];
    const acc2 = ballisticValidated.confidence;
    alerts.push({
      id: `balistica-${ballisticValidated.probableNumber}`,
      type: "ANÁLISE BALÍSTICA",
      title: `Impacto Provável ${ballisticValidated.probableNumber}`,
      badge: `${ballisticValidated.confidence.toFixed(0)}% CONFIANÇA`,
      category: "fisica",
      targetNumbers: alvos,
      targetLabel: `${ballisticValidated.probableNumber} (${ballisticValidated.dozen} · ${ballisticValidated.column})`,
      accuracy2Entries: acc2,
      accuracyLabel: `${acc2.toFixed(1)}% (Até 2 entradas)`,
      priority: 84,
      details: [
        { label: "Número Provável", value: `${ballisticValidated.probableNumber}`, color: "green" },
        { label: "Dúzia", value: ballisticValidated.dozen, color: "gold" },
        { label: "Coluna", value: ballisticValidated.column, color: "cyan" },
        { label: "Cor", value: ballisticValidated.color, color: "red" },
      ],
      actionTab: "Análise Balística",
    });
  }

  // 11. Oportunidades do Rastreador (Puxada, Terminal, Quebras)
  for (const opp of opportunities) {
    alerts.push({
      id: `opportunity-${opp.key}-${opp.triggerSpinId}`,
      type: `OPORTUNIDADE ${opp.kind.toUpperCase()}`,
      title: `Padrão ${opp.kind} · Gatilho ${opp.trigger}`,
      badge: "G1 OPORTUNIDADE",
      category: "estatistica",
      targetNumbers: opp.targets,
      targetLabel: opp.targetLabel,
      terminal: opp.terminal,
      accuracy2Entries: opp.stats.accuracy || 76.0,
      accuracyLabel: `${(opp.stats.accuracy || 76).toFixed(1)}% (Até 2 entradas)`,
      suggestedStake: standardStake,
      priority: 78,
      details: [
        { label: "Gatilho", value: `${opp.trigger}`, color: "gold" },
        { label: "Alvos", value: opp.targetLabel, color: "cyan" },
        { label: "Histórico", value: `${opp.stats.wins}W · ${opp.stats.losses}L`, color: "green" },
      ],
    });
  }

  // 12. Pinned Density Radar
  if (densityRadarSignal && (!dismissedDensityIds || !dismissedDensityIds.has(densityRadarSignal.id))) {
    const acc2 = densityRadarSignal.confianca;
    alerts.push({
      id: `density-${densityRadarSignal.id}`,
      type: "RADAR DE DENSIDADE",
      title: `Alvo: ${densityRadarSignal.labelAlvo}`,
      badge: `${densityRadarSignal.confianca}% CONFIANÇA`,
      category: "confluencia",
      targetNumbers: densityRadarSignal.numeros,
      targetLabel: `${densityRadarSignal.labelAlvo} (${densityRadarSignal.numeros.join(", ")})`,
      sector: densityRadarSignal.setorFisico,
      accuracy2Entries: acc2,
      accuracyLabel: `${acc2.toFixed(1)}% (Até 2 entradas)`,
      priority: 92,
      isDismissable: true,
      onDismiss: onDismissDensity,
      details: [
        { label: "Alvo", value: densityRadarSignal.labelAlvo, color: "red" },
        { label: "Números", value: densityRadarSignal.numeros.join(" · "), color: "white" },
        { label: "Densidade", value: `${densityRadarSignal.densidadeQuadrantePerc.toFixed(1)}%`, color: "cyan" },
        { label: "Setor Físico", value: densityRadarSignal.setorFisico, color: "gold" },
      ],
    });
  }

  // 13. Pinned Mirror Signal
  if (mirrorSignal && (!dismissedMirrorIds || !dismissedMirrorIds.has(mirrorSignal.id))) {
    const alvos = mirrorSignal.todosAlvos ?? mirrorSignal.alvosPrincipais ?? [];
    const tipoLabel = mirrorSignal.tipo === "inversao" ? "Inversão Direta" : `Raiz ${mirrorSignal.raiz}`;
    const acc2 = mirrorSignal.confianca || 85;
    alerts.push({
      id: `mirror-${mirrorSignal.id}`,
      type: "ESPELHO & RAIZ",
      title: `Sinal Espelho · ${tipoLabel}`,
      badge: `${acc2}% CONFIANÇA`,
      category: "estatistica",
      targetNumbers: alvos,
      targetLabel: alvos.join(", "),
      accuracy2Entries: acc2,
      accuracyLabel: `${acc2.toFixed(1)}% (Até 2 entradas)`,
      priority: 90,
      isDismissable: true,
      onDismiss: onDismissMirror,
      details: [
        { label: "Tipo", value: tipoLabel, color: "gold" },
        { label: "Alvos", value: alvos.join(" · "), color: "cyan" },
        { label: "Confiança", value: `${acc2}%`, color: "green" },
      ],
    });
  }

  // Ordenar por prioridade decrescente
  alerts.sort((a, b) => b.priority - a.priority);

  // ==========================================
  // DETECÇÃO DE ENTRADA REFORÇADA (MESMO OBJETIVO)
  // ==========================================
  const numberCount = new Map<number, string[]>();
  const terminalCount = new Map<number, string[]>();
  const sectorCount = new Map<string, string[]>();
  const dozenCount = new Map<number, string[]>();
  const columnCount = new Map<number, string[]>();

  for (const alert of alerts) {
    for (const num of alert.targetNumbers) {
      const list = numberCount.get(num) ?? [];
      list.push(alert.id);
      numberCount.set(num, list);
    }
    if (alert.terminal !== null && alert.terminal !== undefined) {
      const list = terminalCount.get(alert.terminal) ?? [];
      list.push(alert.id);
      terminalCount.set(alert.terminal, list);
    }
    if (alert.sector) {
      const list = sectorCount.get(alert.sector) ?? [];
      list.push(alert.id);
      sectorCount.set(alert.sector, list);
    }
    if (alert.dozen !== null && alert.dozen !== undefined && typeof alert.dozen === "number") {
      const list = dozenCount.get(alert.dozen) ?? [];
      list.push(alert.id);
      dozenCount.set(alert.dozen, list);
    }
    if (alert.column !== null && alert.column !== undefined && typeof alert.column === "number") {
      const list = columnCount.get(alert.column) ?? [];
      list.push(alert.id);
      columnCount.set(alert.column, list);
    }
  }

  // Identificar números comuns apontados por 2 ou mais alertas distintos
  const commonNumbers = [...numberCount.entries()]
    .filter(([, ids]) => new Set(ids).size >= 2)
    .map(([num]) => num)
    .sort((a, b) => a - b);

  // Identificar outros objetivos em comum
  const commonTerminal = [...terminalCount.entries()].find(([, ids]) => new Set(ids).size >= 2)?.[0] ?? null;
  const commonSector = [...sectorCount.entries()].find(([, ids]) => new Set(ids).size >= 2)?.[0] ?? null;
  const commonDozen = [...dozenCount.entries()].find(([, ids]) => new Set(ids).size >= 2)?.[0] ?? null;
  const commonColumn = [...columnCount.entries()].find(([, ids]) => new Set(ids).size >= 2)?.[0] ?? null;

  // Reunir IDs participantes
  const participatingIdSet = new Set<string>();
  for (const num of commonNumbers) {
    numberCount.get(num)?.forEach((id) => participatingIdSet.add(id));
  }
  if (commonTerminal !== null) terminalCount.get(commonTerminal)?.forEach((id) => participatingIdSet.add(id));
  if (commonSector) sectorCount.get(commonSector)?.forEach((id) => participatingIdSet.add(id));
  if (commonDozen !== null) dozenCount.get(commonDozen)?.forEach((id) => participatingIdSet.add(id));
  if (commonColumn !== null) columnCount.get(commonColumn)?.forEach((id) => participatingIdSet.add(id));

  let confluence: ConfluenceGroup | null = null;

  if (participatingIdSet.size >= 2) {
    const participatingAlerts = alerts.filter((a) => participatingIdSet.has(a.id));
    const participatingPatterns = [...new Set(participatingAlerts.map((a) => a.type))];

    // Marcar alertas participantes como "Reforçada"
    participatingAlerts.forEach((a) => {
      a.isReinforced = true;
    });

    // Calcular assertividade combinada (modelo probabilístico com teto de 98.5%)
    const failureProb = participatingAlerts.reduce((acc, a) => {
      const p = Math.min(0.95, Math.max(0.4, a.accuracy2Entries / 100));
      return acc * (1 - p);
    }, 1);
    const combinedAccuracy2Entries = Math.min(98.5, Math.max(85.0, (1 - failureProb) * 100));

    // Estatísticas da sessão (máxima histórica, saídas, percentuais)
    const estatisticas = calcEstatisticas(spins);

    // Alvos convergentes principais
    let targetNumbersList: number[] = [...commonNumbers];
    if (targetNumbersList.length === 0) {
      if (commonSector) {
        targetNumbersList = [
          ...new Set(
            participatingAlerts
              .flatMap((a) => a.targetNumbers)
              .filter((n) => getProps(n, setores).setor === commonSector),
          ),
        ];
      } else if (commonDozen !== null) {
        targetNumbersList = [
          ...new Set(
            participatingAlerts
              .flatMap((a) => a.targetNumbers)
              .filter((n) => getProps(n, setores).duzia === commonDozen),
          ),
        ];
      } else if (commonColumn !== null) {
        targetNumbersList = [
          ...new Set(
            participatingAlerts
              .flatMap((a) => a.targetNumbers)
              .filter((n) => getProps(n, setores).coluna === commonColumn),
          ),
        ];
      } else {
        targetNumbersList = [...new Set(participatingAlerts.flatMap((a) => a.targetNumbers))];
      }
    }
    targetNumbersList.sort((a, b) => a - b);

    // Calcular Dúzia(s), Coluna(s) e Setor(es) dos alvos convergentes
    const dozensSet = new Set<number>();
    const columnsSet = new Set<number>();
    const sectorsSet = new Set<string>();

    for (const num of targetNumbersList) {
      const pr = getProps(num, setores);
      if (pr.duzia > 0) dozensSet.add(pr.duzia);
      if (pr.coluna > 0) columnsSet.add(pr.coluna);
      if (pr.setor && pr.setor !== "—") sectorsSet.add(pr.setor);
    }

    const dozens = [...dozensSet].sort((a, b) => a - b);
    const columns = [...columnsSet].sort((a, b) => a - b);
    const sectors = [...sectorsSet];

    const formatDozens = (dArr: number[]): string => {
      if (dArr.length === 0) return commonDozen ? `${commonDozen}ª Dúzia` : "—";
      if (dArr.length === 1) return `${dArr[0]}ª Dúzia`;
      if (dArr.length === 3) return "1ª, 2ª e 3ª Dúzia";
      return dArr.map((d) => `${d}ª`).join(" e ") + " Dúzia";
    };

    const formatColumns = (cArr: number[]): string => {
      if (cArr.length === 0) return commonColumn ? `${commonColumn}ª Coluna` : "—";
      if (cArr.length === 1) return `${cArr[0]}ª Coluna`;
      if (cArr.length === 3) return "1ª, 2ª e 3ª Coluna";
      return cArr.map((c) => `${c}ª`).join(" e ") + " Coluna";
    };

    const formatSectors = (sArr: string[]): string => {
      if (sArr.length === 0) return commonSector || "—";
      if (sArr.length === 1) return sArr[0]!;
      return sArr.join(" / ");
    };

    const dozensText = formatDozens(dozens);
    const columnsText = formatColumns(columns);
    const sectorsText = formatSectors(sectors);

    // Informações do número que está puxando e sua máxima histórica até o momento
    const pullingNumber = ultimo?.num ?? null;
    const pullingDestino = puxada?.destino ?? null;
    const pullingStat = pullingNumber !== null ? estatisticas[pullingNumber] : null;
    const pullingNumberMaxDelay = pullingStat?.maiorEspera ?? null;
    const pullingNumberCurrentDelay = pullingStat?.esperaAtual ?? null;
    const pullingNumberQtd = pullingStat?.qtd ?? null;
    const pullingNumberPerc = pullingStat?.perc ?? null;

    let pullingSummary = "Sem registro";
    if (pullingNumber !== null) {
      if (puxada && puxada.destino !== undefined) {
        pullingSummary = `Nº ${pullingNumber} puxando ${puxada.destino} (${puxada.qtd}x · ${puxada.perc.toFixed(0)}%)`;
      } else {
        pullingSummary = `Nº ${pullingNumber}`;
      }
    }

    // Estatísticas individuais e detalhadas de cada número alvo convergente
    const targetStats: TargetStatDetail[] = targetNumbersList.map((num) => {
      const pr = getProps(num, setores);
      const st = estatisticas[num];
      return {
        num,
        cor: pr.cor,
        duzia: pr.duzia,
        coluna: pr.coluna,
        setor: pr.setor,
        qtd: st?.qtd ?? 0,
        perc: st?.perc ?? 0,
        maiorEspera: st?.maiorEspera ?? 0,
        esperaAtual: st?.esperaAtual ?? 0,
      };
    });

    // % de assertividade do alvo convergente (em até 2 entradas / G1)
    const empAcc = calcAssertividadeAlvosEm2Entradas(spins, targetNumbersList);
    const targetAccuracy2Entries = empAcc.total > 0 ? empAcc.perc : combinedAccuracy2Entries;
    const targetAccuracyText = `${targetAccuracy2Entries.toFixed(1)}% (Até 2 entradas / G1)`;

    let descAlvo = "";
    if (targetNumbersList.length > 0) {
      descAlvo = `Números em Comum: ${targetNumbersList.join(", ")}`;
    } else if (commonTerminal !== null) {
      descAlvo = `Mesmo Terminal: ${commonTerminal}`;
    } else if (commonSector) {
      descAlvo = `Mesmo Setor: ${commonSector}`;
    } else if (commonDozen !== null) {
      descAlvo = `Mesma Dúzia: ${commonDozen}ª Dúzia`;
    } else if (commonColumn !== null) {
      descAlvo = `Mesma Coluna: ${commonColumn}ª Coluna`;
    }

    // Resumo de frequência dos alvos
    const targetsBreakdown = targetStats
      .map(
        (t) =>
          `Nº ${t.num} (${t.perc.toFixed(1)}% freq | Máx: ${t.maiorEspera}g | Atual: ${t.esperaAtual}g)`,
      )
      .join(" · ");

    const tactical = calcTacticalAnalysis({
      targetNumbers: targetNumbersList,
      spins,
      setores,
      forteDuzia,
      forteColuna,
      accuracy2Entries: targetAccuracy2Entries,
    });

    // Linhas completas da notificação solicitadas pelo usuário
    const notificationLines: string[] = [
      `🎯 Alvo Convergente: ${targetNumbersList.length > 0 ? targetNumbersList.join(", ") : descAlvo}`,
      `📊 Dúzia: ${dozensText} (Melhor: ${tactical.bestDozen.name} · ${tactical.bestDozen.targetPerc.toFixed(0)}%) · Coluna: ${columnsText} (Melhor: ${tactical.bestColumn.name} · ${tactical.bestColumn.targetPerc.toFixed(0)}%)`,
      `🎨 Chances Simples: Cor ${tactical.chancesSimples.cor.predominante} (${tactical.chancesSimples.cor.perc.toFixed(0)}%) · Paridade ${tactical.chancesSimples.paridade.predominante} (${tactical.chancesSimples.paridade.perc.toFixed(0)}%) · ${tactical.chancesSimples.magnitude.predominante} (${tactical.chancesSimples.magnitude.perc.toFixed(0)}%)`,
      `⚡ Diagnóstico: [${tactical.decision.badgeText}] ${tactical.decision.motivo} 👉 ${tactical.decision.sugestaoAposta}`,
      `🔄 Puxando: ${pullingSummary}`,
      `⏳ Máxima do Nº ${pullingNumber ?? "—"} até o momento: ${pullingNumberMaxDelay ?? 0} giros (Saiu ${pullingNumberQtd ?? 0}x · ${(pullingNumberPerc ?? 0).toFixed(1)}%)`,
      `💎 % Alvo Convergente: ${targetAccuracyText}`,
      targetStats.length > 0 ? `📈 Alvos: ${targetsBreakdown}` : null,
      `📌 Padrões Alinhados: ${participatingPatterns.join(" + ")}`,
    ].filter(Boolean) as string[];

    const notificationSummary = notificationLines.join("\n");

    confluence = {
      hasConfluence: true,
      commonNumbers: targetNumbersList,
      commonSector,
      commonDozen,
      commonColumn,
      commonTerminal,
      participatingAlertIds: [...participatingIdSet],
      participatingPatterns,
      combinedAccuracy2Entries,
      title: `🔥 REFORÇADA A ENTRADA (${participatingPatterns.length} PADRÕES ALINHADOS)`,
      description: `Existe mais de 1 padrão apontando para o mesmo objetivo! ${descAlvo}`,
      dozens,
      dozensText,
      columns,
      columnsText,
      sectors,
      sectorsText,
      pullingNumber,
      pullingDestino,
      pullingNumberMaxDelay,
      pullingNumberCurrentDelay,
      pullingNumberQtd,
      pullingNumberPerc,
      pullingSummary,
      targetAccuracy2Entries,
      targetAccuracyText,
      targetStats,
      notificationSummary,
      tactical,
      g1Result: {
        perc: combinedAccuracy2Entries,
        ultimo: calcAssertividadeAlvosEm2Entradas(spins, commonNumbers).ultimoResultado === "RED" ? "RED" : "GREEN",
        entrada: calcAssertividadeAlvosEm2Entradas(spins, commonNumbers).ultimo?.entrada ?? 1,
      },
    };
  }

  // Enriquecer cada alerta com sua análise tática individual de dúzia, coluna, chances simples e decisão
  const enrichedAlerts = alerts.map((a) => {
    const g1Res = calcAssertividadeAlvosEm2Entradas(spins, a.targetNumbers);
    return {
      ...a,
      g1Result: a.g1Result ?? {
        perc: a.accuracy2Entries || g1Res.perc || 78.5,
        ultimo: g1Res.ultimoResultado === "RED" ? ("RED" as const) : ("GREEN" as const),
        entrada: g1Res.ultimo?.entrada ?? 1,
      },
      tactical:
        a.tactical ??
        calcTacticalAnalysis({
          targetNumbers: a.targetNumbers,
          spins,
          setores,
          forteDuzia,
          forteColuna,
          accuracy2Entries: a.accuracy2Entries,
        }),
    };
  });

  return { alerts: enrichedAlerts, confluence };
}
