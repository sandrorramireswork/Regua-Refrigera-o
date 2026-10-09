/**
 * Motor Estatístico Avançado de Três Camadas:
 * 1. Lei do Terceiro (Mapeamento Funcional em Ciclo de 37 Giros)
 * 2. Distribuição de Poisson (Gatilhos de Curto Prazo em Janela de 12 Giros)
 * 3. Critério de Half-Kelly (Dimensionamento de Posição com Proteção de Stop-Loss)
 */

// ============================================================================
// 1. ESTRUTURAÇÃO DO HISTÓRICO & SELETORES
// ============================================================================

export const TAMANHO_CICLO_COMPLETO = 37;
export const TAMANHO_JANELA_CURTA = 12;

export function getCicloAtual(historyArray: number[]): number[] {
  return historyArray.slice(-TAMANHO_CICLO_COMPLETO);
}

export function getJanelaCurta(historyArray: number[]): number[] {
  return historyArray.slice(-TAMANHO_JANELA_CURTA);
}

// ============================================================================
// 2. LEI DO TERCEIRO (Mapeamento Funcional em Ciclo de 37 Giros)
// ============================================================================

/**
 * Constantes Teóricas da Lei do Terceiro na Roleta Europeia (37 números em 37 giros):
 * - Ausentes: (36/37)^37 ≈ 36.23% (~13.4 números)
 * - Únicos: 37 * (1/37) * (36/37)^36 ≈ 37.28% (~13.8 números)
 * - Repetidos: 100% - 36.23% - 37.28% ≈ 26.49% (~9.8 números)
 */
export const TEORICO_LEI_TERCEIRO = {
  ausentesPerc: 36.2,
  unicosPerc: 37.3,
  repetidosPerc: 26.5,
};

export type CategoriaLeiTerceiro = "ausente" | "unico" | "repetido";

export interface LeiDoTerceiroResult {
  /** Números com frequência = 0 no ciclo */
  ausentes: number[];
  /** Números com frequência = 1 no ciclo */
  unicos: number[];
  /** Números com frequência >= 2 no ciclo */
  repetidos: number[];
  /** Frequências individuais de 0 a 36 */
  frequencias: number[];
  /** Mapa de status por número */
  classificacaoNumeros: Record<number, CategoriaLeiTerceiro>;
  /** Contadores */
  totalAusentes: number;
  totalUnicos: number;
  totalRepetidos: number;
  /** Porcentagens observadas sobre os 37 números */
  percAusentes: number;
  percUnicos: number;
  percRepetidos: number;
  /** Discrepâncias em relação às métricas teóricas (Real - Teórico) */
  discrepanciaAusentes: number; // Real - 36.2%
  discrepanciaUnicos: number; // Real - 37.3%
  discrepanciaRepetidos: number; // Real - 26.5%
}

/**
 * Varre o cicloAtual (até 37 giros) e mapeia um array fixo de 0 a 36,
 * classificando em ausentes (0x), únicos (1x) e repetidos (>=2x).
 */
export function calcularLeiDoTerceiro(cicloAtual: number[]): LeiDoTerceiroResult {
  const frequencias = new Array(37).fill(0);

  for (const n of cicloAtual) {
    if (Number.isInteger(n) && n >= 0 && n <= 36) {
      frequencias[n] += 1;
    }
  }

  const ausentes: number[] = [];
  const unicos: number[] = [];
  const repetidos: number[] = [];
  const classificacaoNumeros: Record<number, CategoriaLeiTerceiro> = {};

  for (let num = 0; num <= 36; num++) {
    const f = frequencias[num] ?? 0;
    if (f === 0) {
      ausentes.push(num);
      classificacaoNumeros[num] = "ausente";
    } else if (f === 1) {
      unicos.push(num);
      classificacaoNumeros[num] = "unico";
    } else {
      repetidos.push(num);
      classificacaoNumeros[num] = "repetido";
    }
  }

  const totalAusentes = ausentes.length;
  const totalUnicos = unicos.length;
  const totalRepetidos = repetidos.length;

  const percAusentes = (totalAusentes / 37) * 100;
  const percUnicos = (totalUnicos / 37) * 100;
  const percRepetidos = (totalRepetidos / 37) * 100;

  const discrepanciaAusentes = Number((percAusentes - TEORICO_LEI_TERCEIRO.ausentesPerc).toFixed(1));
  const discrepanciaUnicos = Number((percUnicos - TEORICO_LEI_TERCEIRO.unicosPerc).toFixed(1));
  const discrepanciaRepetidos = Number((percRepetidos - TEORICO_LEI_TERCEIRO.repetidosPerc).toFixed(1));

  return {
    ausentes,
    unicos,
    repetidos,
    frequencias,
    classificacaoNumeros,
    totalAusentes,
    totalUnicos,
    totalRepetidos,
    percAusentes: Number(percAusentes.toFixed(1)),
    percUnicos: Number(percUnicos.toFixed(1)),
    percRepetidos: Number(percRepetidos.toFixed(1)),
    discrepanciaAusentes,
    discrepanciaUnicos,
    discrepanciaRepetidos,
  };
}

// ============================================================================
// 3. DISTRIBUIÇÃO DE POISSON (Gatilhos Estatísticos de Curto Prazo)
// ============================================================================

const factorialCache: number[] = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];

export function factorial(k: number): number {
  if (k < 0) return 1;
  if (k < factorialCache.length) return factorialCache[k]!;
  let res = factorialCache[factorialCache.length - 1]!;
  for (let i = factorialCache.length; i <= k; i++) {
    res *= i;
  }
  return res;
}

/**
 * Fórmula de Poisson:
 * P(k) = (lambda^k * exp(-lambda)) / k!
 */
export function poissonProbability(k: number, lambda: number): number {
  if (k < 0 || lambda <= 0) return 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/**
 * Probabilidade cumulativa de Poisson P(X >= k)
 */
export function poissonCumulativeUpper(k: number, lambda: number): number {
  if (k <= 0) return 1.0;
  let lowerSum = 0;
  for (let i = 0; i < k; i++) {
    lowerSum += poissonProbability(i, lambda);
  }
  return Math.max(0, 1.0 - lowerSum);
}

/**
 * Probabilidade cumulativa de Poisson P(X <= k)
 */
export function poissonCumulativeLower(k: number, lambda: number): number {
  if (k < 0) return 0;
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += poissonProbability(i, lambda);
  }
  return Math.min(1.0, sum);
}

export interface PoissonGroupItem {
  tipo: "DUZIA" | "COLUNA";
  index: 1 | 2 | 3;
  nome: string;
  ocorrencias: number;
  probabilidadeExata: number; // P(k) em %
  probabilidadeCumulativa: number; // %
  lambdaEsperado: number;
  desvioPadrao: number;
  isDesvioExtremo: boolean; // < 5% chance
  tipoAlerta?: "SATURACAO_TENDENCIA" | "ATRASO_SEVERO" | undefined;
  pesoAjusteKelly: number; // Multiplicador para a probabilidade base (ex: 1.1x a 1.35x)
  descricaoAlerta?: string | undefined;
}

export interface PoissonAlertNotification {
  id: string;
  tipo: "SATURACAO_TENDENCIA" | "ATRASO_SEVERO";
  grupo: string;
  ocorrencias: number;
  probabilidadePerc: number;
  mensagem: string;
}

export interface PoissonAnalysisResult {
  lambdaBase: number;
  tamanhoJanela: number;
  duzias: PoissonGroupItem[];
  colunas: PoissonGroupItem[];
  alertasAtivos: PoissonAlertNotification[];
  maiorPesoKelly: {
    zona: string;
    peso: number;
  };
}

/**
 * Implementa o listener/cálculo da ocorrência de Dezenas e Colunas na janelaCurta (12 giros)
 * com detecção de desvio extremo (< 5% de probabilidade natural).
 */
export function calcularPoissonAlertas(janelaCurta: number[]): PoissonAnalysisResult {
  const n = janelaCurta.length || 1;
  // Para uma dúzia ou coluna (12 números em 37), probabilidade p = 12/37
  const pBase = 12 / 37; // ≈ 0.3243
  const lambda = n * pBase; // Para n=12: ≈ 3.8919

  const contDz: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  const contCl: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };

  for (const num of janelaCurta) {
    if (num <= 0 || num > 36) continue;
    // Dúzias
    if (num >= 1 && num <= 12) contDz[1]++;
    else if (num >= 13 && num <= 24) contDz[2]++;
    else contDz[3]++;

    // Colunas
    if (num % 3 === 1) contCl[1]++;
    else if (num % 3 === 2) contCl[2]++;
    else contCl[3]++;
  }

  const alertasAtivos: PoissonAlertNotification[] = [];

  const processarItem = (
    tipo: "DUZIA" | "COLUNA",
    idx: 1 | 2 | 3,
    ocorrencias: number
  ): PoissonGroupItem => {
    const nome = tipo === "DUZIA" ? `${idx}ª Dúzia` : `${idx}ª Coluna`;
    const pExata = poissonProbability(ocorrencias, lambda);
    const pCumUpper = poissonCumulativeUpper(ocorrencias, lambda);
    const pCumLower = poissonCumulativeLower(ocorrencias, lambda);

    let isDesvioExtremo = false;
    let tipoAlerta: "SATURACAO_TENDENCIA" | "ATRASO_SEVERO" | undefined;
    let descricaoAlerta: string | undefined;
    let pesoAjusteKelly = 1.0;

    // Regra: < 5% de chance de ocorrer naturalmente (P < 0.05)
    if (ocorrencias >= 6 && pCumUpper < 0.05) {
      // Repetição de tendência acentuada / Saturação
      isDesvioExtremo = true;
      tipoAlerta = "SATURACAO_TENDENCIA";
      descricaoAlerta = `Saturação / Super-Tendência: ${ocorrencias} ocorrências em ${n} giros (P = ${(pCumUpper * 100).toFixed(1)}% < 5%).`;
      // Peso positivo para momentum em entradas curtas
      pesoAjusteKelly = Number(Math.min(1.35, 1.0 + (ocorrencias - lambda) * 0.06).toFixed(2));

      alertasAtivos.push({
        id: `poisson-sat-${tipo}-${idx}`,
        tipo: "SATURACAO_TENDENCIA",
        grupo: nome,
        ocorrencias,
        probabilidadePerc: Number((pCumUpper * 100).toFixed(2)),
        mensagem: `Alerta Poisson: ${nome} com frequência anômala (${ocorrencias}x em ${n} giros). Probabilidade natural < 5%.`,
      });
    } else if (ocorrencias <= 1 && pCumLower < 0.05 && n >= 10) {
      // Atraso severo / Vácuo estatístico
      isDesvioExtremo = true;
      tipoAlerta = "ATRASO_SEVERO";
      descricaoAlerta = `Atraso Severo: apenas ${ocorrencias}x em ${n} giros (P = ${(pCumLower * 100).toFixed(1)}% < 5%).`;
      pesoAjusteKelly = 0.85;

      alertasAtivos.push({
        id: `poisson-atr-${tipo}-${idx}`,
        tipo: "ATRASO_SEVERO",
        grupo: nome,
        ocorrencias,
        probabilidadePerc: Number((pCumLower * 100).toFixed(2)),
        mensagem: `Aviso Poisson: ${nome} em vácuo estatístico (${ocorrencias}x em ${n} giros). Probabilidade natural < 5%.`,
      });
    }

    return {
      tipo,
      index: idx,
      nome,
      ocorrencias,
      probabilidadeExata: Number((pExata * 100).toFixed(2)),
      probabilidadeCumulativa: Number(((ocorrencias >= lambda ? pCumUpper : pCumLower) * 100).toFixed(2)),
      lambdaEsperado: Number(lambda.toFixed(2)),
      desvioPadrao: Number(Math.sqrt(lambda).toFixed(2)),
      isDesvioExtremo,
      tipoAlerta,
      pesoAjusteKelly,
      descricaoAlerta,
    };
  };

  const duzias = ([1, 2, 3] as const).map((d) => processarItem("DUZIA", d, contDz[d]));
  const colunas = ([1, 2, 3] as const).map((c) => processarItem("COLUNA", c, contCl[c]));

  // Identifica maior peso de Poisson
  let maiorPeso = 1.0;
  let zonaMaiorPeso = "Base";
  for (const item of [...duzias, ...colunas]) {
    if (item.pesoAjusteKelly > maiorPeso) {
      maiorPeso = item.pesoAjusteKelly;
      zonaMaiorPeso = item.nome;
    }
  }

  return {
    lambdaBase: Number(lambda.toFixed(2)),
    tamanhoJanela: n,
    duzias,
    colunas,
    alertasAtivos,
    maiorPesoKelly: {
      zona: zonaMaiorPeso,
      peso: maiorPeso,
    },
  };
}

// ============================================================================
// 4. GESTÃO FINANCEIRA E CRITÉRIO DE KELLY (Half-Kelly)
// ============================================================================

export type TipoApostaKelly = "DUZIA_COLUNA" | "PLENO";

export interface KellyCalculationResult {
  tipoAposta: TipoApostaKelly;
  multiplicador: number; // 2 ou 35
  probabilidadeBase: number; // 12/37 ou 1/37
  pesoPoisson: number;
  probabilidadeAjustada: number;
  edgeMatematico: number; // p - ((1-p)/b)
  kellyFracaoPura: number; // Kelly cheio
  halfKellyFracao: number; // Half-Kelly (50% do Kelly)
  bancaAtual: number;
  stopLoss: number;
  margemSeguraStopLoss: number; // bancaAtual - stopLoss
  stakeSugeridaBruta: number;
  stakeSugeridaFinal: number; // Respeitando estritamente o Stop-Loss
  isApostaSegura: boolean;
  statusDescricao: string;
}

/**
 * Fórmula Half-Kelly adaptada para os multiplicadores de roleta:
 * Stake Sugerida = BancaAtual * (Probabilidade - ((1 - Probabilidade) / Multiplicador)) * 0.5
 *
 * Parâmetros:
 * - Multiplicador: 2 para Dezenas/Colunas, 35 para Plenos.
 * - Probabilidade: base (12/37 ou 1/37) ajustada pelo peso de Poisson.
 * - Restrição rígida: Stake Sugerida nunca excede (BancaAtual - StopLoss).
 */
export function calcularHalfKelly(
  bancaAtual: number,
  tipoAposta: TipoApostaKelly = "DUZIA_COLUNA",
  pesoPoissonAjuste = 1.0,
  stopLoss = 0,
  unidadeMinima = 1.0
): KellyCalculationResult {
  const multiplicador = tipoAposta === "DUZIA_COLUNA" ? 2 : 35;
  const probabilidadeBase = tipoAposta === "DUZIA_COLUNA" ? 12 / 37 : 1 / 37;

  // Probabilidade ajustada pelo peso de Poisson (limitada entre 1% e 90%)
  const probabilidadeAjustada = Math.min(
    0.9,
    Math.max(0.01, probabilidadeBase * Math.max(0.5, pesoPoissonAjuste))
  );

  // Vantagem matemática / Edge: p - (q / b) onde q = 1 - p
  const edgeMatematico = probabilidadeAjustada - (1 - probabilidadeAjustada) / multiplicador;

  // Half-Kelly Fraction
  const kellyFracaoPura = edgeMatematico;
  const halfKellyFracao = Math.max(0, kellyFracaoPura * 0.5);

  // Margem segura até o stop-loss rígido
  const margemSeguraStopLoss = Math.max(0, bancaAtual - stopLoss);

  // Cálculo bruto: BancaAtual * (p - (1-p)/b) * 0.5
  let stakeSugeridaBruta = 0;
  if (halfKellyFracao > 0 && bancaAtual > 0) {
    stakeSugeridaBruta = bancaAtual * halfKellyFracao;
  }

  // Trava de segurança: respeita rigorosamente o limite de Stop-Loss pré-definido
  let stakeSugeridaFinal = Math.min(stakeSugeridaBruta, margemSeguraStopLoss);

  let isApostaSegura = true;
  let statusDescricao = "";

  if (bancaAtual <= stopLoss) {
    stakeSugeridaFinal = 0;
    isApostaSegura = false;
    statusDescricao = "TRAVA ATIVA: Banca atingiu o limite de Stop-Loss. Entrada bloqueada.";
  } else if (edgeMatematico <= 0) {
    stakeSugeridaFinal = 0;
    isApostaSegura = false;
    statusDescricao = "EDGE NEGATIVO: Probabilidade natural desfavorável. Aguarde gatilho Poisson.";
  } else if (stakeSugeridaFinal < unidadeMinima && margemSeguraStopLoss >= unidadeMinima) {
    stakeSugeridaFinal = unidadeMinima;
    statusDescricao = `Ajustado para unidade mínima (R$ ${unidadeMinima.toFixed(2)}).`;
  } else {
    // Arredonda para 2 casas decimais
    stakeSugeridaFinal = Math.round(stakeSugeridaFinal * 100) / 100;
    statusDescricao = `Dimensionamento Half-Kelly validado (${(halfKellyFracao * 100).toFixed(1)}% da banca). Margem stop: R$ ${margemSeguraStopLoss.toFixed(2)}.`;
  }

  return {
    tipoAposta,
    multiplicador,
    probabilidadeBase: Number(probabilidadeBase.toFixed(4)),
    pesoPoisson: Number(pesoPoissonAjuste.toFixed(2)),
    probabilidadeAjustada: Number(probabilidadeAjustada.toFixed(4)),
    edgeMatematico: Number(edgeMatematico.toFixed(4)),
    kellyFracaoPura: Number(kellyFracaoPura.toFixed(4)),
    halfKellyFracao: Number(halfKellyFracao.toFixed(4)),
    bancaAtual,
    stopLoss,
    margemSeguraStopLoss,
    stakeSugeridaBruta: Number(stakeSugeridaBruta.toFixed(2)),
    stakeSugeridaFinal: Number(stakeSugeridaFinal.toFixed(2)),
    isApostaSegura,
    statusDescricao,
  };
}
