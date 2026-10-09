import { type Spin } from "@/lib/roulette";
import { GRUPOS_COLUNA } from "@/lib/quant";

export type GrupoColunaDef = (typeof GRUPOS_COLUNA)[number];

export interface SubgrupoCamufladoStats {
  id: "147" | "258" | "369";
  label: string;
  colunaCorrespondente: 1 | 2 | 3;
  numbers: readonly number[];
  saidas: number;
  observadoPerc: number;
  esperadoPerc: number;
  desvioPerc: number;
  zScore: number;
  atraso: number;
  gapMedio: number;
  maiorGap: number;
  probAtraso: number;
  puxadaDeUltimoPerc: number;
  forcaScore: number; // 0 a 100
}

export interface ChecklistItem {
  rotulo: string;
  ok: boolean;
  detalhe: string;
}

export interface CavaloCamufladoAnalysis {
  subgrupos: SubgrupoCamufladoStats[];
  ultimoGrupoId: "147" | "258" | "369" | "ZERO";
  cavaloAtivo: SubgrupoCamufladoStats;
  melhorColuna: {
    idx: 1 | 2 | 3;
    nome: string;
    confiancaPerc: number;
    motivo: string;
  };
  melhorDuzia: {
    idx: 1 | 2 | 3;
    nome: string;
    confiancaPerc: number;
    motivo: string;
  };
  isMelhorMomento: boolean;
  statusMomento: "MELHOR MOMENTO (ENTRADA CONFIRMADA)" | "MOMENTO EM FORMAÇÃO (ATENÇÃO)" | "AGUARDAR MELHOR ENTRADA";
  veredictoTipo: "forte" | "atencao" | "aguardar";
  badgeText: string;
  tituloAlerta: string;
  explicacao: string;
  sugestaoAposta: string;
  checklist: ChecklistItem[];
  alvosConvergentesNoCavalo: number[];
}

const P_ESPERADO = 12 / 37; // ~32.43%

function grupoDe(num: number): "147" | "258" | "369" | null {
  if (num === 0) return null;
  const g = GRUPOS_COLUNA.find((x: GrupoColunaDef) => (x.numbers as readonly number[]).includes(num));
  return (g?.id as "147" | "258" | "369") ?? null;
}

/**
 * Calcula a análise de força do Cavalo Camuflado (subgrupos 147 / 258 / 369),
 * identificando o melhor momento para pegar a Dúzia e a Coluna com base
 * na tração estatística, matriz de transição de puxadas e convergência nos alvos.
 */
export function analyzeCavaloCamuflado(
  spins: Spin[],
  targetNumbers: number[] = [],
): CavaloCamufladoAnalysis {
  const validos = spins.filter((s) => s.num !== 0);
  const n = validos.length;

  if (n < 3) {
    return buildFallbackCavaloAnalysis(targetNumbers);
  }

  const ultimo = spins[0]!;
  const ultimoGrupoId: "147" | "258" | "369" | "ZERO" = grupoDe(ultimo.num) ?? "ZERO";

  // 1. Mapeamento de sequência e gaps de atraso
  const seqGrupos = validos.map((s) => grupoDe(s.num));
  const gapsMap = new Map<string, number[]>();
  GRUPOS_COLUNA.forEach((g: GrupoColunaDef) => gapsMap.set(g.id, []));
  const ultimoIdxMap = new Map<string, number>();

  seqGrupos.forEach((g, i) => {
    if (!g) return;
    const anterior = ultimoIdxMap.get(g);
    if (anterior !== undefined) {
      const gList = gapsMap.get(g);
      if (gList) gList.push(i - anterior);
    }
    ultimoIdxMap.set(g, i);
  });

  // 2. Matriz de transição entre grupos (O que cada subgrupo puxa)
  const transMap = new Map<string, number>();
  const totalSaidasDeGrupo = new Map<string, number>();

  for (let i = seqGrupos.length - 1; i > 0; i -= 1) {
    const de = seqGrupos[i];
    const para = seqGrupos[i - 1];
    if (!de || !para) continue;
    const key = `${de}>${para}`;
    transMap.set(key, (transMap.get(key) ?? 0) + 1);
    totalSaidasDeGrupo.set(de, (totalSaidasDeGrupo.get(de) ?? 0) + 1);
  }

  // 3. Métricas estatísticas de cada subgrupo (147, 258, 369)
  const subgruposStats: SubgrupoCamufladoStats[] = GRUPOS_COLUNA.map((gDef: GrupoColunaDef, idx: number) => {
    const id = gDef.id as "147" | "258" | "369";
    const colunaCorrespondente = (idx + 1) as 1 | 2 | 3;
    const gNumsSet = new Set<number>(gDef.numbers);

    // Contagem de saídas
    const saidas = validos.filter((s) => gNumsSet.has(s.num)).length;
    const obsPerc = (saidas / n) * 100;
    const espPerc = P_ESPERADO * 100;
    const desvioPerc = obsPerc - espPerc;

    // Z-Score do subgrupo
    const zScore =
      n > 0
        ? (saidas / n - P_ESPERADO) / Math.sqrt((P_ESPERADO * (1 - P_ESPERADO)) / n)
        : 0;

    // Atraso atual
    const firstIdx = seqGrupos.findIndex((g) => g === id);
    const atraso = firstIdx >= 0 ? firstIdx : n;

    // Gaps
    const gaps = gapsMap.get(id) ?? [];
    const gapMedio = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 3.0;
    const maiorGap = gaps.length > 0 ? Math.max(...gaps) : atraso;

    // Probabilidade de atraso acumulada: 1 - (25/37)^atraso
    const probAtraso = (1 - Math.pow(25 / 37, atraso)) * 100;

    // Puxada a partir do último grupo
    let puxadaDeUltimoPerc = 33.3;
    if (ultimoGrupoId !== "ZERO") {
      const transCount = transMap.get(`${ultimoGrupoId}>${id}`) ?? 0;
      const deTotal = totalSaidasDeGrupo.get(ultimoGrupoId) ?? 1;
      puxadaDeUltimoPerc = (transCount / deTotal) * 100;
    }

    // Frequência recente (últimos 15 giros)
    const amostraCurta = validos.slice(0, 15);
    const saidasCurtas = amostraCurta.filter((s) => gNumsSet.has(s.num)).length;
    const freqCurtaPerc = (saidasCurtas / (amostraCurta.length || 1)) * 100;

    // CÁLCULO DO SCORE DE FORÇA DO CAVALO CAMUFLADO (0 a 100)
    // 1. Puxada direta da transição: peso 35%
    const scorePuxada = Math.min(100, (puxadaDeUltimoPerc / 38) * 100);
    // 2. Frequência recente (momentum): peso 25%
    const scoreMomentum = Math.min(100, (freqCurtaPerc / 38) * 100);
    // 3. Z-Score / Maturação: peso 25%
    // Um Z positivo forte indica tendência contínua; um atraso alto com probAtraso > 60% indica gatilho iminente
    let scoreZ = 50;
    if (zScore >= 1.0) scoreZ = Math.min(100, 60 + zScore * 20);
    else if (atraso >= 2 && probAtraso > 50) scoreZ = Math.min(100, 50 + probAtraso * 0.5);
    else if (zScore < -1.0) scoreZ = Math.max(20, 50 + zScore * 15);
    // 4. Convergência com os alvos favoritos: peso 15%
    const alvosNoCavalo = targetNumbers.filter((num) => gNumsSet.has(num)).length;
    const scoreAlvos = Math.min(100, (alvosNoCavalo / Math.max(1, targetNumbers.length)) * 300);

    const forcaScore =
      scorePuxada * 0.35 +
      scoreMomentum * 0.25 +
      scoreZ * 0.25 +
      scoreAlvos * 0.15;

    return {
      id,
      label: gDef.label,
      colunaCorrespondente,
      numbers: gDef.numbers,
      saidas,
      observadoPerc: obsPerc,
      esperadoPerc: espPerc,
      desvioPerc,
      zScore,
      atraso,
      gapMedio,
      maiorGap,
      probAtraso,
      puxadaDeUltimoPerc,
      forcaScore: Math.min(100, Math.max(10, forcaScore)),
    };
  });

  // 4. Identifica o Cavalo Camuflado Ativo (com maior índice de força)
  subgruposStats.sort((a, b) => b.forcaScore - a.forcaScore);
  const cavaloAtivo = subgruposStats[0]!;

  // 5. Determina a MELHOR COLUNA (Mapeada diretamente pelo Cavalo Camuflado Ativo)
  const melhorColuna = {
    idx: cavaloAtivo.colunaCorrespondente,
    nome: `${cavaloAtivo.colunaCorrespondente}ª Coluna`,
    confiancaPerc: Math.min(94, Math.max(65, cavaloAtivo.forcaScore * 0.9 + 10)),
    motivo: `Cavalo ${cavaloAtivo.label} em alta força (${cavaloAtivo.forcaScore.toFixed(0)}%) e taxa de puxada de ${cavaloAtivo.puxadaDeUltimoPerc.toFixed(0)}%.`,
  };

  // 6. Determina a MELHOR DÚZIA para casar com o Cavalo Camuflado
  // Cada subgrupo possui 4 números em cada dúzia:
  // Dúzia 1: [1,4,7,10] ou [2,5,8,11] ou [3,6,9,12]
  // Dúzia 2: [13,16,19,22] ou [14,17,20,23] ou [15,18,21,24]
  // Dúzia 3: [25,28,31,34] ou [26,29,32,35] ou [27,30,33,36]
  const duziaCavaloCounts = [0, 0, 0];
  const cavaloNumsSet = new Set<number>(cavaloAtivo.numbers);

  // Analisa onde os alvos favoritos do painel coincidem com os números deste cavalo
  targetNumbers.forEach((num) => {
    if (cavaloNumsSet.has(num)) {
      if (num >= 1 && num <= 12) duziaCavaloCounts[0] = (duziaCavaloCounts[0] ?? 0) + 1;
      else if (num >= 13 && num <= 24) duziaCavaloCounts[1] = (duziaCavaloCounts[1] ?? 0) + 1;
      else if (num >= 25 && num <= 36) duziaCavaloCounts[2] = (duziaCavaloCounts[2] ?? 0) + 1;
    }
  });

  // Também pondera a frequência dos últimos 12 giros da mesa para essa dúzia
  const amostraRecente = validos.slice(0, 12);
  const duziaRecenteCounts = [0, 0, 0];
  amostraRecente.forEach((s) => {
    if (s.props.duzia >= 1 && s.props.duzia <= 3) {
      const dIdx = s.props.duzia - 1;
      duziaRecenteCounts[dIdx] = (duziaRecenteCounts[dIdx] ?? 0) + 1;
    }
  });

  let bestDuziaIdx: 1 | 2 | 3 = 1;
  let maxDuziaScore = -1;

  for (let d = 1; d <= 3; d++) {
    const alvosNoCavalo = duziaCavaloCounts[d - 1] ?? 0;
    const freqRecente = duziaRecenteCounts[d - 1] ?? 0;
    const scoreD = alvosNoCavalo * 40 + freqRecente * 15;
    if (scoreD > maxDuziaScore) {
      maxDuziaScore = scoreD;
      bestDuziaIdx = d as 1 | 2 | 3;
    }
  }

  const alvosNaMelhorDuzia = duziaCavaloCounts[bestDuziaIdx - 1] ?? 0;
  const melhorDuzia = {
    idx: bestDuziaIdx,
    nome: `${bestDuziaIdx}ª Dúzia`,
    confiancaPerc: Math.min(92, Math.max(62, 60 + alvosNaMelhorDuzia * 10 + (duziaRecenteCounts[bestDuziaIdx - 1] ?? 0) * 3)),
    motivo: `Concentração de ${alvosNaMelhorDuzia} alvos favoritos do Cavalo ${cavaloAtivo.label} na ${bestDuziaIdx}ª Dúzia.`,
  };

  // Alvos convergentes que pertencem ao Cavalo Ativo
  const alvosConvergentesNoCavalo = targetNumbers.filter((num) => cavaloNumsSet.has(num));

  // 7. CHECKLIST TIER 1 / CRITÉRIOS DE FORÇA (ESPELHANDO A IMAGEM DO USUÁRIO)
  const checklist: ChecklistItem[] = [
    {
      rotulo: `Força do Cavalo ${cavaloAtivo.label} ≥ 65%`,
      ok: cavaloAtivo.forcaScore >= 65,
      detalhe: `${cavaloAtivo.forcaScore.toFixed(0)}%`,
    },
    {
      rotulo: `Puxada de Transição ≥ 33%`,
      ok: cavaloAtivo.puxadaDeUltimoPerc >= 33.0,
      detalhe: `${cavaloAtivo.puxadaDeUltimoPerc.toFixed(1)}%`,
    },
    {
      rotulo: `Coluna ${melhorColuna.idx}ª Confirmada pelo Cavalo`,
      ok: true,
      detalhe: `Subgrupo ${cavaloAtivo.label} cobre a ${melhorColuna.idx}ª Coluna`,
    },
    {
      rotulo: `Dúzia ${melhorDuzia.idx}ª com Alvos Convergentes`,
      ok: alvosNaMelhorDuzia >= 2,
      detalhe: `${alvosNaMelhorDuzia} alvos no cruzamento`,
    },
    {
      rotulo: `Z-Score Estável (Z ≥ -0.5 ou Atraso Maduro)`,
      ok: cavaloAtivo.zScore >= -0.5 || cavaloAtivo.probAtraso >= 45,
      detalhe: `Z: ${cavaloAtivo.zScore.toFixed(2)} (Atraso: ${cavaloAtivo.atraso})`,
    },
  ];

  const criteriosAtingidos = checklist.filter((c) => c.ok).length;

  // 8. DECISÃO DO MELHOR MOMENTO
  let isMelhorMomento = false;
  let statusMomento: CavaloCamufladoAnalysis["statusMomento"] = "AGUARDAR MELHOR ENTRADA";
  let veredictoTipo: CavaloCamufladoAnalysis["veredictoTipo"] = "aguardar";
  let badgeText = "🔴 AGUARDAR: FORÇA DISPERSA DO CAVALO";
  let tituloAlerta = "Aguardando Alinhamento do Cavalo Camuflado";
  let explicacao = `O Cavalo Camuflado ${cavaloAtivo.label} apresenta força de ${cavaloAtivo.forcaScore.toFixed(0)}%. Recomenda-se aguardar a confirmação de tração para pegar a dúzia e coluna.`;
  let sugestaoAposta = "Aguarde o próximo giro para afunilamento de transição.";

  if (cavaloAtivo.forcaScore >= 68 && criteriosAtingidos >= 4) {
    isMelhorMomento = true;
    statusMomento = "MELHOR MOMENTO (ENTRADA CONFIRMADA)";
    veredictoTipo = "forte";
    badgeText = "🟢 MELHOR MOMENTO: PEGAR DÚZIA & COLUNA";
    tituloAlerta = `FORÇA MÁXIMA DO CAVALO ${cavaloAtivo.label} — ENTRADA CONFIRMADA`;
    explicacao = `O Cavalo Camuflado ${cavaloAtivo.label} está com tração extrema (${cavaloAtivo.forcaScore.toFixed(0)}%) e taxa de puxada de ${cavaloAtivo.puxadaDeUltimoPerc.toFixed(1)}%. Momento ideal para pegar a ${melhorDuzia.idx}ª Dúzia e a ${melhorColuna.idx}ª Coluna.`;
    sugestaoAposta = `Entrada forte na ${melhorDuzia.nome} + ${melhorColuna.nome} com cobertura nos alvos do Cavalo (${alvosConvergentesNoCavalo.join(", ") || "12 casas"}).`;
  } else if (cavaloAtivo.forcaScore >= 52 && criteriosAtingidos >= 3) {
    isMelhorMomento = true;
    statusMomento = "MOMENTO EM FORMAÇÃO (ATENÇÃO)";
    veredictoTipo = "atencao";
    badgeText = "🟡 ENTRADA MODERADA: PRIORIZAR COLUNA";
    tituloAlerta = `Cavalo ${cavaloAtivo.label} em Formação (${cavaloAtivo.forcaScore.toFixed(0)}%)`;
    explicacao = `A ${melhorColuna.nome} está fortemente alinhada ao Cavalo Camuflado ${cavaloAtivo.label}. A ${melhorDuzia.nome} tem boa probabilidade, mas requer stake moderada.`;
    sugestaoAposta = `Apostar na ${melhorColuna.nome} com stake padrão e cobrir a ${melhorDuzia.nome}.`;
  }

  return {
    subgrupos: subgruposStats,
    ultimoGrupoId,
    cavaloAtivo,
    melhorColuna,
    melhorDuzia,
    isMelhorMomento,
    statusMomento,
    veredictoTipo,
    badgeText,
    tituloAlerta,
    explicacao,
    sugestaoAposta,
    checklist,
    alvosConvergentesNoCavalo,
  };
}

function buildFallbackCavaloAnalysis(targetNumbers: number[] = []): CavaloCamufladoAnalysis {
  const fallbackSubgrupos: SubgrupoCamufladoStats[] = GRUPOS_COLUNA.map((g: GrupoColunaDef, idx: number) => ({
    id: g.id as "147" | "258" | "369",
    label: g.label,
    colunaCorrespondente: (idx + 1) as 1 | 2 | 3,
    numbers: g.numbers,
    saidas: 10,
    observadoPerc: 33.3,
    esperadoPerc: 32.4,
    desvioPerc: 0.9,
    zScore: 0.2,
    atraso: 1,
    gapMedio: 3.0,
    maiorGap: 5,
    probAtraso: 32.4,
    puxadaDeUltimoPerc: 33.3,
    forcaScore: 60,
  }));

  return {
    subgrupos: fallbackSubgrupos,
    ultimoGrupoId: "369",
    cavaloAtivo: fallbackSubgrupos[1]!, // 258
    melhorColuna: {
      idx: 2,
      nome: "2ª Coluna",
      confiancaPerc: 75,
      motivo: "Cavalo 258 com distribuição balanceada de alvos.",
    },
    melhorDuzia: {
      idx: 2,
      nome: "2ª Dúzia",
      confiancaPerc: 70,
      motivo: "Convergência central de números favoritos.",
    },
    isMelhorMomento: false,
    statusMomento: "AGUARDAR MELHOR ENTRADA",
    veredictoTipo: "aguardar",
    badgeText: "🟡 AGUARDAR: HISTÓRICO EM CALIBRAÇÃO",
    tituloAlerta: "Cavalo Camuflado Inicializando",
    explicacao: "Aguardando mais giros válidos para calibrar a força dos cavalos camuflados 147, 258 e 369.",
    sugestaoAposta: "Aguarde o registro dos primeiros giros.",
    checklist: [
      { rotulo: "Histórico de giros suficiente", ok: false, detalhe: "< 3 giros" },
      { rotulo: "Cavalo Camuflado calibrado", ok: true, detalhe: "Padrão 258" },
      { rotulo: "Coluna mapeada", ok: true, detalhe: "2ª Coluna" },
    ],
    alvosConvergentesNoCavalo: targetNumbers.slice(0, 3),
  };
}
