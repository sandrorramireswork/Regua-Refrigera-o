/**
 * Módulo de Gestão de Banca Inteligente — Engine de Cálculos Financeiros e Juros Compostos
 * Projeto: Neon Roulette Pro (Executive Dark Mode)
 */

export interface GestaoSetupConfig {
  bancaInicial: number;            // Ex: 1000.00
  taxaJurosDiaria: number;         // Ex: 2.0 (%)
  diasOperacao: number;            // 1 a 60 (padrão: 30)
  stopWinAtivo: boolean;           // Toggle switch (padrão: false)
  stopWinTipo: "percent" | "valor";// % sobre a banca inicial do dia ou R$ fixo
  stopWinValor: number;            // Ex: 5 (%) ou R$ 50.00
  stopLossAtivo: boolean;          // Toggle switch (padrão: false)
  stopLossTipo: "percent" | "valor";// % sobre a banca inicial do dia ou R$ fixo
  stopLossValor: number;           // Ex: 10 (%) ou R$ 100.00
}

export type StatusGatilho =
  | "STOP_WIN"
  | "STOP_LOSS"
  | "LUCRO"
  | "PREJUIZO"
  | "NEUTRO"
  | "PENDENTE";

export interface RegistroDiario {
  dia: number;                     // 1 a 60
  labelDia: string;                // "Dia 01", "Dia 02", etc.
  bancaInicial: number;            // Banca do início do dia (cascata da banca final anterior)
  bancaProjetada: number;          // Projeção teórica exponencial: bancaInicialGlobal * (1 + taxa/100)^dia
  bancaFinal: number | null;       // Input manual inserido pelo usuário
  lucroReais: number | null;       // bancaFinal - bancaInicial
  lucroPerc: number | null;        // ((bancaFinal - bancaInicial) / bancaInicial) * 100
  statusGatilho: StatusGatilho;    // Gatilho atingido
  stopWinAlcancado: boolean;       // Se bateu stop win configurado
  stopLossAlcancado: boolean;      // Se bateu stop loss configurado
}

export interface MetricasExecutivas {
  bancaAtualReal: number;
  projecaoIdealVsRealidade: number; // Diferença monetária (Realidade - Projeção Ideal no último dia operado)
  mediaPLDiario: number;            // Média real de P/L por dia com registro
  roiTotalPerc: number;             // ((bancaAtual - bancaInicial) / bancaInicial) * 100
  taxaConsistenciaPerc: number;     // (% dias com lucro / total dias operados) * 100
  diasOperados: number;
  diasGreen: number;
  diasRed: number;
  projecaoFinalMes: number;         // Projeção teórica no último dia selecionado
  // MÉTRICAS AVANÇADAS ADICIONADAS
  maxDrawdownReais: number;         // Maior rebaixamento de capital absoluto pico-a-fundo (R$)
  maxDrawdownPerc: number;          // Maior rebaixamento em %
  fatorRecuperacao: number;         // Lucro acumulado / Max Drawdown
  payoffRatio: number;              // Média Ganho / Média Perda
  expectativaMatematicaDiaria: number; // (winRate * avgWin) - (lossRate * avgLoss)
  mediaGanhoDia: number;            // Média em R$ nos dias positivos
  mediaPerdaDia: number;            // Média em R$ nos dias negativos
  streakAtual: number;              // Dias consecutivos positivos (+N) ou negativos (-N)
  maiorStreakGreen: number;         // Maior sequência de dias positivos
  maiorStreakRed: number;           // Maior sequência de dias negativos
  projecaoEstimadaFimPlano: number; // Projeção com base na média diária real
  diasRestantes: number;            // Dias restantes para fechar o plano
}

export const DEFAULT_GESTAO_SETUP: GestaoSetupConfig = {
  bancaInicial: 1000,
  taxaJurosDiaria: 2.0,
  diasOperacao: 30,
  stopWinAtivo: false,
  stopWinTipo: "percent",
  stopWinValor: 5.0,
  stopLossAtivo: false,
  stopLossTipo: "percent",
  stopLossValor: 10.0,
};

const STORAGE_KEY_SETUP = "neon_gestao_banca_setup_v1";
const STORAGE_KEY_DIAS = "neon_gestao_banca_dias_v1";

/**
 * Carrega a configuração do setup do localStorage
 */
export function loadGestaoSetup(): GestaoSetupConfig {
  if (typeof window === "undefined") return DEFAULT_GESTAO_SETUP;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETUP);
    if (!raw) return DEFAULT_GESTAO_SETUP;
    const parsed = JSON.parse(raw);
    return {
      bancaInicial: Number(parsed.bancaInicial) || 1000,
      taxaJurosDiaria: Math.max(0.1, Number(parsed.taxaJurosDiaria) || 2.0),
      diasOperacao: Math.min(60, Math.max(1, Number(parsed.diasOperacao) || 30)),
      stopWinAtivo: Boolean(parsed.stopWinAtivo),
      stopWinTipo: parsed.stopWinTipo === "valor" ? "valor" : "percent",
      stopWinValor: Math.max(0, Number(parsed.stopWinValor) || 5.0),
      stopLossAtivo: Boolean(parsed.stopLossAtivo),
      stopLossTipo: parsed.stopLossTipo === "valor" ? "valor" : "percent",
      stopLossValor: Math.max(0, Number(parsed.stopLossValor) || 10.0),
    };
  } catch {
    return DEFAULT_GESTAO_SETUP;
  }
}

/**
 * Salva a configuração do setup no localStorage
 */
export function saveGestaoSetup(config: GestaoSetupConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SETUP, JSON.stringify(config));
  } catch (err) {
    console.warn("Falha ao salvar setup de gestão:", err);
  }
}

/**
 * Carrega os registros manuais diários inseridos pelo usuário
 */
export function loadRegistrosManuais(): Record<number, number | null> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DIAS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Salva os registros manuais diários no localStorage
 */
export function saveRegistrosManuais(registros: Record<number, number | null>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_DIAS, JSON.stringify(registros));
  } catch (err) {
    console.warn("Falha ao salvar registros manuais:", err);
  }
}

/**
 * Formata um valor numérico em moeda Brasileira (BRL)
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata uma porcentagem com sinal
 */
export function formatarPerc(valor: number, comSinal = true): string {
  const sinal = comSinal && valor > 0 ? "+" : "";
  return `${sinal}${valor.toFixed(2)}%`;
}

/**
 * Calcula valores compatíveis de Stop Win e Stop Loss para sincronização conjunta
 */
export interface TravasCompatibilidade {
  stopWinReais: number;
  stopWinPerc: number;
  stopLossReais: number;
  stopLossPerc: number;
}

export function calcularCompatibilidadeTravas(
  config: GestaoSetupConfig,
  bankrollBase: number
): TravasCompatibilidade {
  const base = Math.max(1, bankrollBase);
  let stopWinReais = 0;
  let stopWinPerc = 0;
  if (config.stopWinTipo === "percent") {
    stopWinPerc = config.stopWinValor;
    stopWinReais = base * (config.stopWinValor / 100);
  } else {
    stopWinReais = config.stopWinValor;
    stopWinPerc = (config.stopWinValor / base) * 100;
  }

  let stopLossReais = 0;
  let stopLossPerc = 0;
  if (config.stopLossTipo === "percent") {
    stopLossPerc = config.stopLossValor;
    stopLossReais = base * (config.stopLossValor / 100);
  } else {
    stopLossReais = config.stopLossValor;
    stopLossPerc = (config.stopLossValor / base) * 100;
  }

  return {
    stopWinReais: Math.round(stopWinReais * 100) / 100,
    stopWinPerc: Math.round(stopWinPerc * 100) / 100,
    stopLossReais: Math.round(stopLossReais * 100) / 100,
    stopLossPerc: Math.round(stopLossPerc * 100) / 100,
  };
}

/**
 * Calcula a tabela completa de acompanhamento em cascata (até 60 dias)
 */
export function calcularTabelaAcompanhamento(
  config: GestaoSetupConfig,
  registrosManuais: Record<number, number | null>
): RegistroDiario[] {
  const diasTotais = Math.min(60, Math.max(1, config.diasOperacao));
  const taxaFracao = config.taxaJurosDiaria / 100;
  const linhas: RegistroDiario[] = [];

  let bancaInicialAcumulada = config.bancaInicial;

  for (let d = 1; d <= diasTotais; d++) {
    const labelDia = `Dia ${String(d).padStart(2, "0")}`;
    
    // Projeção ideal teórica exponencial pura para este dia:
    // BancaInicialGlobal * (1 + taxa)^d
    const bancaProjetada = config.bancaInicial * Math.pow(1 + taxaFracao, d);

    // Banca Inicial deste dia:
    const bancaInicialDia = d === 1 ? config.bancaInicial : bancaInicialAcumulada;

    // Valor manual inserido
    const manualVal = registrosManuais[d];
    const temInput = manualVal !== undefined && manualVal !== null && !isNaN(manualVal);
    const bancaFinal = temInput ? Number(manualVal) : null;

    let lucroReais: number | null = null;
    let lucroPerc: number | null = null;
    let statusGatilho: StatusGatilho = "PENDENTE";
    let stopWinAlcancado = false;
    let stopLossAlcancado = false;

    if (bancaFinal !== null) {
      lucroReais = bancaFinal - bancaInicialDia;
      lucroPerc = bancaInicialDia > 0 ? (lucroReais / bancaInicialDia) * 100 : 0;

      // Verificação do gatilho de Stop Win
      if (config.stopWinAtivo) {
        const metaWinReais =
          config.stopWinTipo === "percent"
            ? bancaInicialDia * (config.stopWinValor / 100)
            : config.stopWinValor;
        if (lucroReais >= metaWinReais && metaWinReais > 0) {
          stopWinAlcancado = true;
        }
      }

      // Verificação do gatilho de Stop Loss
      if (config.stopLossAtivo) {
        const limiteLossReais =
          config.stopLossTipo === "percent"
            ? bancaInicialDia * (config.stopLossValor / 100)
            : config.stopLossValor;
        // Perda diária (quando lucroReais é negativo): se a perda for igual ou maior que o limite
        if (lucroReais <= -limiteLossReais && limiteLossReais > 0) {
          stopLossAlcancado = true;
        }
      }

      // Atribuição de status do gatilho
      if (stopWinAlcancado) {
        statusGatilho = "STOP_WIN";
      } else if (stopLossAlcancado) {
        statusGatilho = "STOP_LOSS";
      } else if (lucroReais > 0) {
        statusGatilho = "LUCRO";
      } else if (lucroReais < 0) {
        statusGatilho = "PREJUIZO";
      } else {
        statusGatilho = "NEUTRO";
      }

      // Atualiza a banca acumulada para o próximo dia em cascata
      bancaInicialAcumulada = bancaFinal;
    } else {
      // Se não há input manual, projeta o próximo dia a partir da meta teórica
      bancaInicialAcumulada = bancaProjetada;
    }

    linhas.push({
      dia: d,
      labelDia,
      bancaInicial: bancaInicialDia,
      bancaProjetada,
      bancaFinal,
      lucroReais,
      lucroPerc,
      statusGatilho,
      stopWinAlcancado,
      stopLossAlcancado,
    });
  }

  return linhas;
}

/**
 * Calcula os KPIs e Métricas Executivas Avançadas da gestão
 */
export function calcularMetricasExecutivas(
  config: GestaoSetupConfig,
  tabela: RegistroDiario[]
): MetricasExecutivas {
  let ultimoDiaOperado: RegistroDiario | null = null;
  let totalLucro = 0;
  let diasGreen = 0;
  let diasRed = 0;
  let diasOperados = 0;

  let somaGanhos = 0;
  let somaPerdas = 0;

  // Cálculo de Drawdown pico-a-fundo
  let peak = config.bancaInicial;
  let maxDrawdownReais = 0;
  let maxDrawdownPerc = 0;

  // Cálculo de Sequências (Streaks)
  let streakAtual = 0;
  let maiorStreakGreen = 0;
  let maiorStreakRed = 0;
  let currentGreenCount = 0;
  let currentRedCount = 0;

  for (const row of tabela) {
    if (row.bancaFinal !== null) {
      diasOperados++;
      ultimoDiaOperado = row;
      const pnl = row.lucroReais ?? 0;
      totalLucro += pnl;

      // Drawdown
      if (row.bancaFinal > peak) {
        peak = row.bancaFinal;
      }
      const ddReais = peak - row.bancaFinal;
      const ddPerc = peak > 0 ? (ddReais / peak) * 100 : 0;
      if (ddReais > maxDrawdownReais) maxDrawdownReais = ddReais;
      if (ddPerc > maxDrawdownPerc) maxDrawdownPerc = ddPerc;

      // Ganhos e Perdas
      if (pnl > 0) {
        diasGreen++;
        somaGanhos += pnl;
        currentGreenCount++;
        currentRedCount = 0;
        streakAtual = currentGreenCount;
        if (currentGreenCount > maiorStreakGreen) maiorStreakGreen = currentGreenCount;
      } else if (pnl < 0) {
        diasRed++;
        somaPerdas += Math.abs(pnl);
        currentRedCount++;
        currentGreenCount = 0;
        streakAtual = -currentRedCount;
        if (currentRedCount > maiorStreakRed) maiorStreakRed = currentRedCount;
      } else {
        currentGreenCount = 0;
        currentRedCount = 0;
        streakAtual = 0;
      }
    }
  }

  const bancaAtualReal = ultimoDiaOperado !== null && ultimoDiaOperado.bancaFinal !== null
    ? ultimoDiaOperado.bancaFinal
    : config.bancaInicial;

  const projecaoIdealNoUltimoDia = ultimoDiaOperado !== null
    ? ultimoDiaOperado.bancaProjetada
    : config.bancaInicial;

  const projecaoIdealVsRealidade = bancaAtualReal - projecaoIdealNoUltimoDia;
  const mediaPLDiario = diasOperados > 0 ? totalLucro / diasOperados : 0;
  const roiTotalPerc = config.bancaInicial > 0
    ? ((bancaAtualReal - config.bancaInicial) / config.bancaInicial) * 100
    : 0;

  const taxaConsistenciaPerc = diasOperados > 0 ? (diasGreen / diasOperados) * 100 : 0;

  const projecaoFinalMes = tabela.length > 0 && tabela[tabela.length - 1]
    ? tabela[tabela.length - 1]!.bancaProjetada
    : config.bancaInicial;

  const mediaGanhoDia = diasGreen > 0 ? somaGanhos / diasGreen : 0;
  const mediaPerdaDia = diasRed > 0 ? somaPerdas / diasRed : 0;
  const payoffRatio = mediaPerdaDia > 0 ? mediaGanhoDia / mediaPerdaDia : (mediaGanhoDia > 0 ? mediaGanhoDia : 1);
  const winRateFrac = diasOperados > 0 ? diasGreen / diasOperados : 0;
  const lossRateFrac = diasOperados > 0 ? diasRed / diasOperados : 0;
  const expectativaMatematicaDiaria = (winRateFrac * mediaGanhoDia) - (lossRateFrac * mediaPerdaDia);
  const fatorRecuperacao = maxDrawdownReais > 0 ? totalLucro / maxDrawdownReais : (totalLucro > 0 ? 99.9 : 0);

  const diasRestantes = Math.max(0, config.diasOperacao - diasOperados);
  const projecaoEstimadaFimPlano = bancaAtualReal + (mediaPLDiario * diasRestantes);

  return {
    bancaAtualReal,
    projecaoIdealVsRealidade,
    mediaPLDiario,
    roiTotalPerc,
    taxaConsistenciaPerc,
    diasOperados,
    diasGreen,
    diasRed,
    projecaoFinalMes,
    maxDrawdownReais,
    maxDrawdownPerc,
    fatorRecuperacao,
    payoffRatio,
    expectativaMatematicaDiaria,
    mediaGanhoDia,
    mediaPerdaDia,
    streakAtual,
    maiorStreakGreen,
    maiorStreakRed,
    projecaoEstimadaFimPlano,
    diasRestantes,
  };
}
