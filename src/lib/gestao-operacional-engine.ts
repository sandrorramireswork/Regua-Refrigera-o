/**
 * Módulo de Gestão Operacional & Motores Financeiros de Roleta
 * Suporta:
 * 1. Martingale Progressivo (Gales)
 * 2. D'Alembert Avançado & Expert Analítico (Clássico, Reverso e Adaptativo Confluência)
 * 3. Mapeamento de Alvos (Dúzia, Coluna, Personalizado/Valores Editáveis)
 * 4. Listener Matemático de Stop-Win e Stop-Loss com Bloqueio de Overtrading
 */

import { REDS, VOISINS, TIERS, ORPHELINS } from "@/lib/roulette";

export type SistemaProgressao = "MARTINGALE" | "DALEMBERT_CLASSICO" | "DALEMBERT_REVERSO" | "DALEMBERT_ADAPTATIVO";

export type TipoEntradaGatilho =
  | "duzia"
  | "coluna"
  | "duzia_coluna"
  | "cor"
  | "par_impar"
  | "maior_menor"
  | "mercado_numeros"
  | "personalizado";

export interface GestaoOperacionalConfig {
  /** Sistema de progressão ativo */
  sistema: SistemaProgressao;
  /** Tipo de entrada configurada na gestão */
  tipoEntrada: TipoEntradaGatilho;
  /** Alvo selecionado: 1, 2, 3 para Dúzia/Coluna ou string de números/subtipos para outros mercados */
  alvoEntrada: number | string;
  /** Valor base da aposta inicial (R$) */
  valorEntradaInicial: number;
  /** Número máximo de gales (para Martingale) ou teto de níveis (para D'Alembert) */
  maxGales: number;
  /** Teto máximo de unidades para D'Alembert (padrão: 8) */
  tetoNivelDalembert: number;
  /** Incremento de unidade em R$ no D'Alembert (padrão: igual ao valor inicial) */
  unidadeDalembert: number;
  /** Reset automático do ciclo no D'Alembert ao atingir lucro acumulado positivo */
  resetarCicloComLucro?: boolean;
  /** Stop-Win / Meta em R$ */
  stopWinValor: number;
  stopWinAtivo: boolean;
  /** Stop-Loss / Limite em R$ */
  stopLossValor: number;
  stopLossAtivo: boolean;
}

export interface AlvoResolvido {
  tipo: TipoEntradaGatilho;
  subtipo?: string;
  nome: string;
  descricao: string;
  numerosValidos: number[];
  numerosDuplos?: number[]; // Para interseção Dúzia + Coluna
  multiplicadorPayout: number; // Lucro líquido padrão
  multiplicadorPayoutDuplo?: number; // Para interseção Dupla (Dúzia+Coluna)
  multiplicadorPayoutParcial?: number; // Para acerto parcial (Dúzia ou Coluna)
  coberturaPercentual: number;
  formulaExplicativa: string;
  retornoEstimadoTexto: string;
}

export const BLACKS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
export const PARES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36];
export const IMPARES = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
export const MENORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
export const MAIORES = [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
export const ZERO_SPIEL = [12, 35, 3, 26, 0, 32, 15];

export interface OperacaoAoVivoState {
  emAndamento: boolean;
  sistemaAtivo: SistemaProgressao;
  /** Para Martingale: 0 = G0, 1 = G1, 2 = G2... */
  faseGale: number;
  /** Para D'Alembert: Nível da pirâmide (1, 2, 3...) */
  nivelDalembert: number;
  /** Aposta calculada para o giro atual */
  valorApostaAtual: number;
  /** Alvo congelado no momento que a entrada foi acionada */
  alvoAtivo: AlvoResolvido;
  /** Perdas acumuladas no ciclo em andamento */
  perdasCicloAtual: number;
  /** Contadores de vitórias e derrotas no ciclo */
  greensNoCiclo: number;
  redsNoCiclo: number;
  /** Histórico dos giros durante este ciclo operacional */
  historicoCiclo: Array<{
    rodada: number;
    numero: number;
    resultado: "GREEN" | "RED";
    aposta: number;
    lucroOuPerda: number;
  }>;
}

export interface SessaoFinanceiraOperacional {
  bancaInicial: number;
  bancaAtual: number;
  lucroLiquidoSessao: number;
  roiSessaoPerc: number;
  totalEntradasAcionadas: number;
  totalGirosOperados: number;
  greensTotais: number;
  redsTotais: number;
  statusTrava: "LIVRE" | "META_ALCANCADA" | "STOP_LOSS_ATINGIDO";
  bloqueioAtivo: boolean;
  ultimaMensagemListener?: string | undefined;
}

export const STORAGE_KEY_OPERACIONAL_CONFIG = "neon_gestao_operacional_config_v2";
export const STORAGE_KEY_OPERACIONAL_SESSAO = "neon_gestao_operacional_sessao_v2";
export const EVENT_OPERACIONAL_CHANGE = "neon-gestao-operacional-change";

export const DEFAULT_OPERACIONAL_CONFIG: GestaoOperacionalConfig = {
  sistema: "MARTINGALE",
  tipoEntrada: "duzia",
  alvoEntrada: 1, // 1ª Dúzia por padrão
  valorEntradaInicial: 10.0,
  maxGales: 2,
  tetoNivelDalembert: 8,
  unidadeDalembert: 10.0,
  resetarCicloComLucro: true,
  stopWinValor: 100.0,
  stopWinAtivo: true,
  stopLossValor: 150.0,
  stopLossAtivo: true,
};

export const DEFAULT_OPERACIONAL_SESSAO: SessaoFinanceiraOperacional = {
  bancaInicial: 1000.0,
  bancaAtual: 1000.0,
  lucroLiquidoSessao: 0.0,
  roiSessaoPerc: 0.0,
  totalEntradasAcionadas: 0,
  totalGirosOperados: 0,
  greensTotais: 0,
  redsTotais: 0,
  statusTrava: "LIVRE",
  bloqueioAtivo: false,
};

/**
 * Resolve a lista de números válidos e dados do alvo a partir da configuração
 */
export function resolverAlvo(tipo: TipoEntradaGatilho, alvo: number | string): AlvoResolvido {
  // 1. DÚZIA SIMPLES (1ª, 2ª ou 3ª Dúzia) - Paga 2:1
  if (tipo === "duzia") {
    const d = typeof alvo === "number" ? alvo : parseInt(String(alvo), 10) || 1;
    const clamped = (Math.max(1, Math.min(3, d))) as 1 | 2 | 3;
    let numeros: number[] = [];
    if (clamped === 1) numeros = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    else if (clamped === 2) numeros = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    else numeros = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];

    return {
      tipo: "duzia",
      nome: `${clamped}ª Dúzia`,
      descricao: clamped === 1 ? "1 a 12" : clamped === 2 ? "13 a 24" : "25 a 36",
      numerosValidos: numeros,
      multiplicadorPayout: 2.0, // Retorno 3:1 bruto, 2:1 lucro líquido
      coberturaPercentual: Number(((numeros.length / 37) * 100).toFixed(1)),
      formulaExplicativa: "Paga 2:1 (+200% de lucro líquido + aposta devolvida)",
      retornoEstimadoTexto: "2x lucro (+200%)",
    };
  }

  // 2. COLUNA SIMPLES (1ª, 2ª ou 3ª Coluna) - Paga 2:1
  if (tipo === "coluna") {
    const c = typeof alvo === "number" ? alvo : parseInt(String(alvo), 10) || 1;
    const clamped = (Math.max(1, Math.min(3, c))) as 1 | 2 | 3;
    const numeros: number[] = [];
    for (let i = 1; i <= 36; i++) {
      if (i % 3 === (clamped === 3 ? 0 : clamped)) {
        numeros.push(i);
      }
    }

    return {
      tipo: "coluna",
      nome: `${clamped}ª Coluna`,
      descricao: clamped === 1 ? "1, 4, 7...34" : clamped === 2 ? "2, 5, 8...35" : "3, 6, 9...36",
      numerosValidos: numeros,
      multiplicadorPayout: 2.0,
      coberturaPercentual: Number(((numeros.length / 37) * 100).toFixed(1)),
      formulaExplicativa: "Paga 2:1 (+200% de lucro líquido + aposta devolvida)",
      retornoEstimadoTexto: "2x lucro (+200%)",
    };
  }

  // 3. DÚZIA COM COLUNA (Cobertura Cruzada / Confluência)
  if (tipo === "duzia_coluna") {
    let d = 1;
    let c = 1;
    if (typeof alvo === "string") {
      const match = alvo.match(/(\d+)\D+(\d+)/);
      if (match && match[1] && match[2]) {
        d = parseInt(match[1], 10) || 1;
        c = parseInt(match[2], 10) || 1;
      }
    } else if (typeof alvo === "number") {
      d = Math.max(1, Math.min(3, alvo));
      c = 1;
    }
    const clampedD = (Math.max(1, Math.min(3, d))) as 1 | 2 | 3;
    const clampedC = (Math.max(1, Math.min(3, c))) as 1 | 2 | 3;

    let numsDuzia: number[] = [];
    if (clampedD === 1) numsDuzia = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    else if (clampedD === 2) numsDuzia = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    else numsDuzia = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];

    const numsColuna: number[] = [];
    for (let i = 1; i <= 36; i++) {
      if (i % 3 === (clampedC === 3 ? 0 : clampedC)) {
        numsColuna.push(i);
      }
    }

    // Interseção (4 números com Green Duplo)
    const numerosDuplos = numsDuzia.filter((n) => numsColuna.includes(n));
    // União (20 números válidos)
    const numerosValidos = Array.from(new Set([...numsDuzia, ...numsColuna])).sort((a, b) => a - b);

    return {
      tipo: "duzia_coluna",
      nome: `${clampedD}ª Dúzia + ${clampedC}ª Coluna`,
      descricao: `Interseção Dupla (4N): ${numerosDuplos.join(", ")} | Total 20N`,
      numerosValidos,
      numerosDuplos,
      multiplicadorPayout: 2.0,
      multiplicadorPayoutDuplo: 2.0, // +200% lucro líquido se bater na interseção
      multiplicadorPayoutParcial: 0.5, // +50% lucro líquido se bater em 1 das duas
      coberturaPercentual: Number(((numerosValidos.length / 37) * 100).toFixed(1)),
      formulaExplicativa: "Duplo (4N): +200% líquido | Parcial (16N): +50% líquido",
      retornoEstimadoTexto: "Duplo +2x / Parcial +0.5x",
    };
  }

  // 4. COR (Vermelho / Preto) - Paga 1:1
  if (tipo === "cor") {
    const isRed = String(alvo).toLowerCase().includes("verm") || String(alvo).toLowerCase() === "red";
    const numeros = isRed ? REDS : BLACKS;
    return {
      tipo: "cor",
      nome: isRed ? "Cor: Vermelho" : "Cor: Preto",
      descricao: isRed ? "18 Números Vermelhos" : "18 Números Pretos",
      numerosValidos: numeros,
      multiplicadorPayout: 1.0, // 1:1 líquido
      coberturaPercentual: Number(((numeros.length / 37) * 100).toFixed(1)),
      formulaExplicativa: "Paga 1:1 (+100% de lucro líquido + aposta devolvida)",
      retornoEstimadoTexto: "1x lucro (+100%)",
    };
  }

  // 5. PAR OU ÍMPAR - Paga 1:1
  if (tipo === "par_impar") {
    const isPar = String(alvo).toLowerCase().includes("par") && !String(alvo).toLowerCase().includes("impar");
    const numeros = isPar ? PARES : IMPARES;
    return {
      tipo: "par_impar",
      nome: isPar ? "Pares (Even)" : "Ímpares (Odd)",
      descricao: isPar ? "18 Números Pares" : "18 Números Ímpares",
      numerosValidos: numeros,
      multiplicadorPayout: 1.0,
      coberturaPercentual: Number(((numeros.length / 37) * 100).toFixed(1)),
      formulaExplicativa: "Paga 1:1 (+100% de lucro líquido + aposta devolvida)",
      retornoEstimadoTexto: "1x lucro (+100%)",
    };
  }

  // 6. MAIOR OU MENOR (1-18 / 19-36) - Paga 1:1
  if (tipo === "maior_menor") {
    const isMaior = String(alvo).toLowerCase().includes("maior") || String(alvo).includes("19");
    const numeros = isMaior ? MAIORES : MENORES;
    return {
      tipo: "maior_menor",
      nome: isMaior ? "Maior (19-36)" : "Menor (1-18)",
      descricao: isMaior ? "18 Números Altos (19 a 36)" : "18 Números Baixos (1 a 18)",
      numerosValidos: numeros,
      multiplicadorPayout: 1.0,
      coberturaPercentual: Number(((numeros.length / 37) * 100).toFixed(1)),
      formulaExplicativa: "Paga 1:1 (+100% de lucro líquido + aposta devolvida)",
      retornoEstimadoTexto: "1x lucro (+100%)",
    };
  }

  // 7. MERCADO DE NÚMEROS (Pleno, Cavalo, Rua, Quadrado, Seisena, Setores)
  if (tipo === "mercado_numeros") {
    const raw = String(alvo).toLowerCase();
    if (raw.startsWith("pleno")) {
      const num = parseInt(raw.split(":")[1] || "17", 10) || 0;
      const validNum = Math.max(0, Math.min(36, num));
      return {
        tipo: "mercado_numeros",
        subtipo: "pleno",
        nome: `Pleno (Nº ${validNum})`,
        descricao: `Aposta direta no número ${validNum}`,
        numerosValidos: [validNum],
        multiplicadorPayout: 35.0, // 35:1 líquido
        coberturaPercentual: 2.7,
        formulaExplicativa: "Paga 35:1 (+3500% de lucro líquido + aposta devolvida)",
        retornoEstimadoTexto: "35x lucro (+3500%)",
      };
    }
    if (raw.startsWith("cavalo")) {
      const nums = (raw.split(":")[1] || "17,20")
        .split(/[\s,;_-]+/)
        .map((n) => parseInt(n, 10))
        .filter((n) => !isNaN(n) && n >= 0 && n <= 36);
      const numeros = nums.length >= 2 ? nums.slice(0, 2) : [17, 20];
      return {
        tipo: "mercado_numeros",
        subtipo: "cavalo",
        nome: `Cavalo (${numeros.join(" & ")})`,
        descricao: `Divisão em 2 números: ${numeros.join(", ")}`,
        numerosValidos: numeros,
        multiplicadorPayout: 17.0, // 17:1 líquido
        coberturaPercentual: 5.4,
        formulaExplicativa: "Paga 17:1 (+1700% de lucro líquido + aposta devolvida)",
        retornoEstimadoTexto: "17x lucro (+1700%)",
      };
    }
    if (raw.startsWith("rua") || raw.startsWith("transversal")) {
      const linhaIndex = parseInt(raw.split(":")[1] || "1", 10) || 1;
      const row = Math.max(1, Math.min(12, linhaIndex));
      const numeros = [(row - 1) * 3 + 1, (row - 1) * 3 + 2, (row - 1) * 3 + 3];
      return {
        tipo: "mercado_numeros",
        subtipo: "rua",
        nome: `Rua / Transversal (${numeros.join("-")})`,
        descricao: `Linha ${row}: números ${numeros.join(", ")}`,
        numerosValidos: numeros,
        multiplicadorPayout: 11.0, // 11:1 líquido
        coberturaPercentual: 8.1,
        formulaExplicativa: "Paga 11:1 (+1100% de lucro líquido + aposta devolvida)",
        retornoEstimadoTexto: "11x lucro (+1100%)",
      };
    }
    if (raw.startsWith("quadrado") || raw.startsWith("corner")) {
      const cornerIndex = parseInt(raw.split(":")[1] || "1", 10) || 1;
      const n1 = Math.max(1, Math.min(32, cornerIndex));
      const numeros = [n1, n1 + 1, n1 + 3, n1 + 4];
      return {
        tipo: "mercado_numeros",
        subtipo: "quadrado",
        nome: `Quadrado (${numeros.join("-")})`,
        descricao: `Bloco de 4 números: ${numeros.join(", ")}`,
        numerosValidos: numeros,
        multiplicadorPayout: 8.0, // 8:1 líquido
        coberturaPercentual: 10.8,
        formulaExplicativa: "Paga 8:1 (+800% de lucro líquido + aposta devolvida)",
        retornoEstimadoTexto: "8x lucro (+800%)",
      };
    }
    if (raw.startsWith("seisena") || raw.startsWith("sixline")) {
      const rowStart = parseInt(raw.split(":")[1] || "1", 10) || 1;
      const startNum = Math.max(1, Math.min(31, (rowStart - 1) * 3 + 1));
      const numeros = [startNum, startNum + 1, startNum + 2, startNum + 3, startNum + 4, startNum + 5];
      return {
        tipo: "mercado_numeros",
        subtipo: "seisena",
        nome: `Seisena (${startNum} a ${startNum + 5})`,
        descricao: `6 números em duas linhas adjacentes`,
        numerosValidos: numeros,
        multiplicadorPayout: 5.0, // 5:1 líquido
        coberturaPercentual: 16.2,
        formulaExplicativa: "Paga 5:1 (+500% de lucro líquido + aposta devolvida)",
        retornoEstimadoTexto: "5x lucro (+500%)",
      };
    }
    if (raw.includes("tiers")) {
      return {
        tipo: "mercado_numeros",
        subtipo: "setor_tiers",
        nome: "Setor: Tiers du Cylindre",
        descricao: "12 números opostos ao zero (6 cavalos)",
        numerosValidos: TIERS,
        multiplicadorPayout: 2.0, // Payout líquido 2:1
        coberturaPercentual: 32.4,
        formulaExplicativa: "Tiers du Cylindre: Paga 2:1 (+200% de lucro líquido)",
        retornoEstimadoTexto: "2x lucro (+200%)",
      };
    }
    if (raw.includes("voisins")) {
      return {
        tipo: "mercado_numeros",
        subtipo: "setor_voisins",
        nome: "Setor: Voisins du Zéro",
        descricao: "17 números em torno do zero (9 fichas)",
        numerosValidos: VOISINS,
        multiplicadorPayout: 1.4,
        coberturaPercentual: 45.9,
        formulaExplicativa: "Vizinhos do Zero (17N): Retorno ponderado ~1.4x líquido",
        retornoEstimadoTexto: "1.4x lucro (+140%)",
      };
    }
    if (raw.includes("orphelins")) {
      return {
        tipo: "mercado_numeros",
        subtipo: "setor_orphelins",
        nome: "Setor: Orphelins (Órfãos)",
        descricao: "8 números órfãos das duas alas (5 fichas)",
        numerosValidos: ORPHELINS,
        multiplicadorPayout: 2.6,
        coberturaPercentual: 21.6,
        formulaExplicativa: "Órfãos (8N): Retorno ponderado ~2.6x líquido",
        retornoEstimadoTexto: "2.6x lucro (+260%)",
      };
    }
    if (raw.includes("zero") || raw.includes("spiel")) {
      return {
        tipo: "mercado_numeros",
        subtipo: "setor_zero_spiel",
        nome: "Setor: Zero Spiel (Jeu Zéro)",
        descricao: "7 números vizinhos diretos do zero (4 fichas)",
        numerosValidos: ZERO_SPIEL,
        multiplicadorPayout: 3.5,
        coberturaPercentual: 18.9,
        formulaExplicativa: "Jeu Zéro (7N): Retorno ponderado ~3.5x líquido",
        retornoEstimadoTexto: "3.5x lucro (+350%)",
      };
    }

    // Default mercado números: Pleno 17
    return {
      tipo: "mercado_numeros",
      subtipo: "pleno",
      nome: "Pleno (Nº 17)",
      descricao: "Aposta direta no número 17",
      numerosValidos: [17],
      multiplicadorPayout: 35.0,
      coberturaPercentual: 2.7,
      formulaExplicativa: "Paga 35:1 (+3500% de lucro líquido + aposta devolvida)",
      retornoEstimadoTexto: "35x lucro (+3500%)",
    };
  }

  // 8. PERSONALIZADO / ALVO DE NÚMEROS EDITÁVEL
  const str = String(alvo);
  const extraidos = str
    .split(/[\s,;]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 36);

  const numeros = extraidos.length > 0 ? Array.from(new Set(extraidos)).sort((a, b) => a - b) : [14, 17, 20, 23];
  const payout = numeros.length > 0 ? Number(((36 / numeros.length) - 1).toFixed(2)) : 35.0;

  return {
    tipo: "personalizado",
    nome: `Alvo Custom (${numeros.length}N)`,
    descricao: numeros.slice(0, 6).join(", ") + (numeros.length > 6 ? "..." : ""),
    numerosValidos: numeros,
    multiplicadorPayout: Math.max(0.1, payout),
    coberturaPercentual: Number(((numeros.length / 37) * 100).toFixed(1)),
    formulaExplicativa: `Distribuição uniforme: Lucro de +${payout.toFixed(2)}x (+${(payout * 100).toFixed(0)}%)`,
    retornoEstimadoTexto: `+${payout.toFixed(2)}x líquido`,
  };
}

/**
 * Carrega a configuração operacional salva no localStorage
 */
export function loadGestaoOperacionalConfig(): GestaoOperacionalConfig {
  if (typeof window === "undefined") return DEFAULT_OPERACIONAL_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPERACIONAL_CONFIG);
    if (!raw) return DEFAULT_OPERACIONAL_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      sistema: parsed.sistema || "MARTINGALE",
      tipoEntrada: parsed.tipoEntrada || "duzia",
      alvoEntrada: parsed.alvoEntrada !== undefined ? parsed.alvoEntrada : 1,
      valorEntradaInicial: Math.max(1, Number(parsed.valorEntradaInicial) || 10.0),
      maxGales: Math.min(6, Math.max(0, Number(parsed.maxGales) ?? 2)),
      tetoNivelDalembert: Math.min(20, Math.max(2, Number(parsed.tetoNivelDalembert) || 8)),
      unidadeDalembert: Math.max(1, Number(parsed.unidadeDalembert) || 10.0),
      stopWinValor: Math.max(0, Number(parsed.stopWinValor) || 100.0),
      stopWinAtivo: Boolean(parsed.stopWinAtivo ?? true),
      stopLossValor: Math.max(0, Number(parsed.stopLossValor) || 150.0),
      stopLossAtivo: Boolean(parsed.stopLossAtivo ?? true),
    };
  } catch {
    return DEFAULT_OPERACIONAL_CONFIG;
  }
}

/**
 * Salva a configuração operacional e despacha evento de sincronização
 */
export function saveGestaoOperacionalConfig(config: GestaoOperacionalConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_OPERACIONAL_CONFIG, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(EVENT_OPERACIONAL_CHANGE));
  } catch {
    /* ignore */
  }
}

/**
 * Carrega a sessão financeira acumulada
 */
export function loadSessaoOperacional(): SessaoFinanceiraOperacional {
  if (typeof window === "undefined") return DEFAULT_OPERACIONAL_SESSAO;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPERACIONAL_SESSAO);
    if (!raw) return DEFAULT_OPERACIONAL_SESSAO;
    return { ...DEFAULT_OPERACIONAL_SESSAO, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_OPERACIONAL_SESSAO;
  }
}

/**
 * Salva a sessão financeira e despacha evento
 */
export function saveSessaoOperacional(sessao: SessaoFinanceiraOperacional): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_OPERACIONAL_SESSAO, JSON.stringify(sessao));
    window.dispatchEvent(new CustomEvent(EVENT_OPERACIONAL_CHANGE));
  } catch {
    /* ignore */
  }
}

/**
 * Calcula a aposta para uma fase específica de Martingale
 */
export function calcularApostaMartingale(valorBase: number, faseGale: number): number {
  return Number((valorBase * Math.pow(2, faseGale)).toFixed(2));
}

/**
 * Calcula a aposta para um nível de D'Alembert
 */
export function calcularApostaDalembert(
  valorBase: number,
  nivel: number,
  unidade: number,
  teto: number
): number {
  const nivelLimitado = Math.min(teto, Math.max(1, nivel));
  return Number((valorBase + (nivelLimitado - 1) * unidade).toFixed(2));
}

export interface ResultadoProcessamentoGiro {
  resultado: "GREEN" | "RED";
  plGiro: number;
  proximaOperacao: OperacaoAoVivoState;
  proximaSessao: SessaoFinanceiraOperacional;
  cicloFinalizado: boolean;
  mensagemNotificacao?: string | undefined;
}

/**
 * Processador central de giros: executa a regra do Martingale ou D'Alembert,
 * atualiza o P&L em tempo real e ativa os listeners matemáticos de Stop-Win e Stop-Loss.
 */
export function processarGiroOperacional(
  numeroSorteado: number,
  operacaoAtual: OperacaoAoVivoState,
  config: GestaoOperacionalConfig,
  sessaoAtual: SessaoFinanceiraOperacional,
  confluenciaScore = 75
): ResultadoProcessamentoGiro {
  if (!operacaoAtual.emAndamento) {
    return {
      resultado: "RED",
      plGiro: 0,
      proximaOperacao: operacaoAtual,
      proximaSessao: sessaoAtual,
      cicloFinalizado: false,
    };
  }

  const { alvoAtivo, sistemaAtivo, faseGale, nivelDalembert, valorApostaAtual, perdasCicloAtual } = operacaoAtual;
  const isGreen = alvoAtivo.numerosValidos.includes(numeroSorteado);
  const resultado: "GREEN" | "RED" = isGreen ? "GREEN" : "RED";

  let plGiro = 0;
  let novoFaseGale = faseGale;
  let novoNivelDalembert = nivelDalembert;
  let novasPerdasCiclo = perdasCicloAtual;
  let cicloFinalizado = false;
  let mensagemNotificacao: string | undefined;

  // 1. CÁLCULO FINANCEIRO DO GIRO
  if (isGreen) {
    if (alvoAtivo.tipo === "duzia_coluna") {
      const isDuplo = alvoAtivo.numerosDuplos?.includes(numeroSorteado);
      if (isDuplo) {
        const mult = alvoAtivo.multiplicadorPayoutDuplo ?? 2.0;
        plGiro = Number((valorApostaAtual * mult).toFixed(2));
        mensagemNotificacao = `🎯 GREEN DUPLO (Dúzia + Coluna no nº ${numeroSorteado})! Payout 2:1 em ambas! Lucro: +R$ ${plGiro.toFixed(2)}`;
      } else {
        const mult = alvoAtivo.multiplicadorPayoutParcial ?? 0.5;
        plGiro = Number((valorApostaAtual * mult).toFixed(2));
        mensagemNotificacao = `✅ GREEN PARCIAL (Dúzia ou Coluna no nº ${numeroSorteado})! Lucro líquido: +R$ ${plGiro.toFixed(2)}`;
      }
    } else {
      const lucroLiquidoGiro = valorApostaAtual * alvoAtivo.multiplicadorPayout;
      plGiro = Number(lucroLiquidoGiro.toFixed(2));
      mensagemNotificacao = `✅ GREEN CONFIRMADO (${alvoAtivo.nome} no nº ${numeroSorteado})! Lucro: +R$ ${plGiro.toFixed(2)}`;
    }
  } else {
    plGiro = -valorApostaAtual;
    novasPerdasCiclo += valorApostaAtual;
    mensagemNotificacao = `❌ RED (nº ${numeroSorteado} fora de ${alvoAtivo.nome}). Prejuízo: -R$ ${valorApostaAtual.toFixed(2)}`;
  }

  // 2. PROGRESSÃO DOS MOTORES (MARTINGALE vs DALEMBERT)
  if (sistemaAtivo === "MARTINGALE") {
    if (isGreen) {
      cicloFinalizado = true;
      novoFaseGale = 0;
      novasPerdasCiclo = 0;
    } else {
      if (faseGale < config.maxGales) {
        novoFaseGale = faseGale + 1;
        mensagemNotificacao = `Red no alvo. Avançando para Gale ${novoFaseGale} (${config.valorEntradaInicial * Math.pow(2, novoFaseGale)} R$).`;
      } else {
        cicloFinalizado = true;
        novoFaseGale = 0;
        novasPerdasCiclo = 0;
        mensagemNotificacao = `Limite de Gales atingido (${config.maxGales} gales). Operação finalizada.`;
      }
    }
  } else if (sistemaAtivo === "DALEMBERT_CLASSICO") {
    if (isGreen) {
      novoNivelDalembert = Math.max(1, nivelDalembert - 1);
      if (novoNivelDalembert === 1 && (plGiro - perdasCicloAtual) >= 0) {
        cicloFinalizado = true;
        mensagemNotificacao = `D'Alembert: Equilíbrio positivo alcançado! Lucro consolidado no ciclo.`;
      } else {
        mensagemNotificacao = `Green D'Alembert (+R$ ${plGiro.toFixed(2)}). Nível reduzido para ${novoNivelDalembert}.`;
      }
    } else {
      if (nivelDalembert < config.tetoNivelDalembert) {
        novoNivelDalembert = nivelDalembert + 1;
        mensagemNotificacao = `Red D'Alembert (-R$ ${valorApostaAtual.toFixed(2)}). Nível aumentado para ${novoNivelDalembert}.`;
      } else {
        cicloFinalizado = true;
        novoNivelDalembert = 1;
        mensagemNotificacao = `Teto de segurança D'Alembert atingido (Nível ${config.tetoNivelDalembert}). Ciclo reiniciado.`;
      }
    }
  } else if (sistemaAtivo === "DALEMBERT_REVERSO") {
    if (isGreen) {
      novoNivelDalembert = Math.min(config.tetoNivelDalembert, nivelDalembert + 1);
      mensagemNotificacao = `Green Reverso (+R$ ${plGiro.toFixed(2)}). Aumentando momentum para Nível ${novoNivelDalembert}.`;
    } else {
      novoNivelDalembert = Math.max(1, nivelDalembert - 1);
      if (novoNivelDalembert === 1) {
        cicloFinalizado = true;
      }
      mensagemNotificacao = `Red Reverso. Reduzindo exposição para Nível ${novoNivelDalembert}.`;
    }
  } else if (sistemaAtivo === "DALEMBERT_ADAPTATIVO") {
    const bonusConfluencia = confluenciaScore >= 80;
    if (isGreen) {
      novoNivelDalembert = Math.max(1, nivelDalembert - 1);
      if (bonusConfluencia) {
        cicloFinalizado = true;
        mensagemNotificacao = `Green com Alta Confluência (${confluenciaScore}%). Lucro executado com sucesso!`;
      } else {
        mensagemNotificacao = `Green Adaptativo (+R$ ${plGiro.toFixed(2)}).`;
      }
    } else {
      novoNivelDalembert = Math.min(config.tetoNivelDalembert, nivelDalembert + 1);
      mensagemNotificacao = `Red Adaptativo. Nível calibrado para ${novoNivelDalembert}.`;
    }
  }

  // 3. PRÓXIMA APOSTA CALCULADA
  let proximaAposta = config.valorEntradaInicial;
  if (sistemaAtivo === "MARTINGALE") {
    proximaAposta = calcularApostaMartingale(config.valorEntradaInicial, novoFaseGale);
  } else {
    proximaAposta = calcularApostaDalembert(
      config.valorEntradaInicial,
      novoNivelDalembert,
      config.unidadeDalembert,
      config.tetoNivelDalembert
    );
  }

  // 4. ATUALIZAÇÃO DA SESSÃO FINANCEIRA (TEMPO REAL)
  const novoLucroLiquido = Number((sessaoAtual.lucroLiquidoSessao + plGiro).toFixed(2));
  const novaBancaAtual = Number((sessaoAtual.bancaInicial + novoLucroLiquido).toFixed(2));
  const novoRoi = sessaoAtual.bancaInicial > 0 ? Number(((novoLucroLiquido / sessaoAtual.bancaInicial) * 100).toFixed(2)) : 0;

  let statusTrava: SessaoFinanceiraOperacional["statusTrava"] = "LIVRE";
  let bloqueioAtivo = false;
  let msgListener: string | undefined;

  // 5. MATHEMATICAL LISTENER (STOP-WIN & STOP-LOSS)
  if (config.stopWinAtivo && config.stopWinValor > 0 && novoLucroLiquido >= config.stopWinValor) {
    statusTrava = "META_ALCANCADA";
    bloqueioAtivo = true;
    cicloFinalizado = true;
    msgListener = `🏆 META ALCANÇADA! Lucro atingiu R$ ${novoLucroLiquido.toFixed(2)} (+${novoRoi}% ROI). Botão bloqueado para proteção contra overtrading.`;
  } else if (config.stopLossAtivo && config.stopLossValor > 0 && novoLucroLiquido <= -config.stopLossValor) {
    statusTrava = "STOP_LOSS_ATINGIDO";
    bloqueioAtivo = true;
    cicloFinalizado = true;
    msgListener = `🛑 STOP-LOSS ATINGIDO! Saldo atingiu o limite de tolerância (R$ ${novoLucroLiquido.toFixed(2)}). Entradas bloqueadas.`;
  }

  const proximaSessao: SessaoFinanceiraOperacional = {
    ...sessaoAtual,
    bancaAtual: novaBancaAtual,
    lucroLiquidoSessao: novoLucroLiquido,
    roiSessaoPerc: novoRoi,
    totalGirosOperados: sessaoAtual.totalGirosOperados + 1,
    greensTotais: isGreen ? sessaoAtual.greensTotais + 1 : sessaoAtual.greensTotais,
    redsTotais: !isGreen ? sessaoAtual.redsTotais + 1 : sessaoAtual.redsTotais,
    statusTrava,
    bloqueioAtivo,
    ultimaMensagemListener: msgListener,
  };

  const proximaOperacao: OperacaoAoVivoState = {
    ...operacaoAtual,
    emAndamento: !cicloFinalizado,
    faseGale: cicloFinalizado ? 0 : novoFaseGale,
    nivelDalembert: cicloFinalizado ? 1 : novoNivelDalembert,
    valorApostaAtual: proximaAposta,
    perdasCicloAtual: cicloFinalizado ? 0 : novasPerdasCiclo,
    greensNoCiclo: isGreen ? operacaoAtual.greensNoCiclo + 1 : operacaoAtual.greensNoCiclo,
    redsNoCiclo: !isGreen ? operacaoAtual.redsNoCiclo + 1 : operacaoAtual.redsNoCiclo,
    historicoCiclo: [
      ...operacaoAtual.historicoCiclo,
      {
        rodada: operacaoAtual.historicoCiclo.length + 1,
        numero: numeroSorteado,
        resultado,
        aposta: valorApostaAtual,
        lucroOuPerda: plGiro,
      },
    ],
  };

  return {
    resultado,
    plGiro,
    proximaOperacao,
    proximaSessao,
    cicloFinalizado,
    mensagemNotificacao: msgListener || mensagemNotificacao,
  };
}
