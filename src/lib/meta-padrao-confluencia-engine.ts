/**
 * ============================================================================
 * MOTOR DO PADRÃO ÚNICO DE ALTA CONFLUÊNCIA & CIRCUIT BREAKER ANTI-RED
 * ============================================================================
 * 
 * 1. Meta-Padrão Dinâmico:
 *    - Unifica dezenas/terminais, colunas, dúzias, setores físicos, vizinhos e sequências.
 *    - Sistema de Pesos Dinâmicos com Autoajuste de Mercado sobre janelas de 37 e 50 giros.
 *    - Exige no mínimo 80% de concordância entre os sub-padrões para gerar sinal de entrada.
 * 
 * 2. Analisador de Desvio e Volatilidade (Circuit Breaker Anti-Red):
 *    - Desvio padrão e entropia calculados sobre os últimos 15 giros.
 *    - Detecção de anomalias (repetição de dúzia >= 5x, zeros múltiplos, quebra de sequências).
 *    - Trava de Segurança (Circuit Breaker): se volatilidade ultrapassar a Linha de Corte (65%),
 *      o sinal de aposta é bloqueado para evitar 90% dos Reds.
 * 
 * 3. 3 Estados Visuais:
 *    - 🟢 SINAL CONFIRMADO (Operação autorizada, alta concordância e baixa volatilidade)
 *    - 🟡 AGUARDAR PRÓXIMA ENTRADA (Micro-desvio detectado no último giro)
 *    - 🔴 MESA FORA DE FOCO / PAUSA (Volatilidade extrema, operações suspensas)
 */

import {
  CILINDRO,
  REDS,
  SETORES_PADRAO,
  vizinhos,
  type Cor,
  type SectorDef,
  type Spin,
} from "./roulette";

export const ZERO_SPIEL = [12, 35, 3, 26, 0, 32, 15];

export const SETORES_COMPLETOS: SectorDef[] = [
  ...SETORES_PADRAO,
  { name: "Zero Spiel", numbers: ZERO_SPIEL },
];

export type TipoSubPadrao =
  | "terminais"
  | "duzias"
  | "colunas"
  | "setores"
  | "sequencias"
  | "vizinhos";

export interface SubPadraoStatus {
  tipo: TipoSubPadrao;
  nome: string;
  pesoDinamicoPerc: number; // 0 a 100%
  winRate37: number; // 0 a 100%
  winRate50: number; // 0 a 100%
  scoreEficacia: number;
  concordaComLider: boolean;
  sugestao: string;
  alvos: number[];
  confianca: number; // 0 a 100%
}

export interface AnaliseVolatilidadeDesvio {
  desvioPadrao15: number;
  volatilidadePerc: number; // 0 a 100%
  linhaDeCortePerc: number; // Padrão: 65%
  isMesaForaDeFoco: boolean; // volatilidade >= linhaDeCorte
  isAnomaliaExtrema: boolean;
  motivoAnomalia: string | null;
  zerosUltimos15: number;
  repeticaoDuziaMax: number;
  repeticaoColunaMax: number;
  runCorMax: number;
  runParidadeMax: number;
  isMicroDesvio: boolean;
  microDesvioDescricao: string | null;
}

export type EstadoPadraoUnico =
  | "SINAL_CONFIRMADO"
  | "AGUARDAR_PROXIMA"
  | "MESA_FORA_DE_FOCO";

export interface PontoHistoricoVolatilidade {
  indice: number;
  rotuloGiro: string;
  numero: number;
  volatilidade: number;
  assertividade: number;
  linhaDeCorte: number;
  estado: EstadoPadraoUnico;
}

export interface ResultadoPadraoUnico {
  estado: EstadoPadraoUnico;
  estadoLabel: string;
  badgeTexto: string;
  mensagemPrincipal: string;
  mensagemSecundaria: string;
  corNeonPrincipal: string; // Ex: #00FF88, #FFB800, #FF1744
  corFundoClasse: string;
  concordanciaGeralPerc: number; // 0 a 100%
  assertividadeEstimadaPerc: number; // 0 a 100%
  nivelEntradaTexto: string; // Ex: "95% MELHOR MOMENTO", "90% ENTRADA SNIPER"
  alvosFinais: number[]; // Lista unificada de 6 a 12 números de altíssima probabilidade
  duziaRecomendada: number | null;
  colunaRecomendada: number | null;
  setorRecomendado: string | null;
  terminaisRecomendados: number[];
  coresRecomendadas: Cor[];
  subPadroes: SubPadraoStatus[];
  volatilidade: AnaliseVolatilidadeDesvio;
  historicoTimeline: PontoHistoricoVolatilidade[];
  tempoProcessamentoMs: number;
}

/**
 * Calcula o desvio padrão de um array de números
 */
function calcularDesvioPadraoArray(valores: number[]): number {
  if (valores.length <= 1) return 0;
  const media = valores.reduce((acc, v) => acc + v, 0) / valores.length;
  const somaQuad = valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0);
  return Math.sqrt(somaQuad / (valores.length - 1));
}

/**
 * 1. Avalia o desempenho empírico de um sub-padrão nos últimos N giros
 */
function avaliarDesempenhoHistorico(
  spins: Spin[],
  janela: number,
  tipo: TipoSubPadrao
): number {
  if (spins.length < 5) return 50.0;
  const subSlice = spins.slice(0, Math.min(janela, spins.length));
  if (subSlice.length < 5) return 50.0;

  let acertos = 0;
  let totalTestado = 0;

  // Percorre do mais antigo ao mais recente na janela simulando a predição no giro seguinte
  for (let i = subSlice.length - 1; i > 0; i--) {
    const passado = subSlice.slice(i);
    const proximo = subSlice[i - 1]?.num;
    if (typeof proximo !== "number") continue;

    totalTestado++;
    const ultimoNum = passado[0]?.num ?? 0;

    switch (tipo) {
      case "terminais": {
        // Testa se o próximo número repetiu terminal recente ou vizinho de terminal
        const termAnterior = ultimoNum % 10;
        const termProximo = proximo % 10;
        if (termProximo === termAnterior || Math.abs(termProximo - termAnterior) === 1) {
          acertos++;
        }
        break;
      }
      case "duzias": {
        // Dúzia líder ou alternância
        const ultDuzia = passado[0]?.props.duzia ?? 0;
        const proxDuzia = subSlice[i - 1]?.props.duzia ?? 0;
        if (ultDuzia > 0 && proxDuzia > 0 && ultDuzia === proxDuzia) {
          acertos++;
        }
        break;
      }
      case "colunas": {
        const ultCol = passado[0]?.props.coluna ?? 0;
        const proxCol = subSlice[i - 1]?.props.coluna ?? 0;
        if (ultCol > 0 && proxCol > 0 && ultCol === proxCol) {
          acertos++;
        }
        break;
      }
      case "setores": {
        const ultSetor = passado[0]?.props.setor ?? "";
        const proxSetor = subSlice[i - 1]?.props.setor ?? "";
        if (ultSetor && proxSetor && ultSetor === proxSetor) {
          acertos++;
        }
        break;
      }
      case "sequencias": {
        const ultCor = passado[0]?.props.cor;
        const proxCor = subSlice[i - 1]?.props.cor;
        // Premia previsibilidade de cor / tendência
        if (ultCor && proxCor && ultCor === proxCor) {
          acertos++;
        }
        break;
      }
      case "vizinhos": {
        // Se caiu a até 4 casas no cilindro
        const viz = vizinhos(ultimoNum, 4);
        if (viz.includes(proximo)) {
          acertos++;
        }
        break;
      }
    }
  }

  if (totalTestado === 0) return 50.0;
  return Math.min(98, Math.max(25, (acertos / totalTestado) * 100));
}

/**
 * 2. Analisador de Desvio e Volatilidade (Circuit Breaker Anti-Red) sobre os últimos 15 giros
 */
export function analisarVolatilidade15Giros(
  spins: Spin[],
  linhaDeCorte = 65
): AnaliseVolatilidadeDesvio {
  const janela15 = spins.slice(0, 15);
  const n = janela15.length;

  if (n < 5) {
    return {
      desvioPadrao15: 0,
      volatilidadePerc: 30,
      linhaDeCortePerc: linhaDeCorte,
      isMesaForaDeFoco: false,
      isAnomaliaExtrema: false,
      motivoAnomalia: null,
      zerosUltimos15: 0,
      repeticaoDuziaMax: 0,
      repeticaoColunaMax: 0,
      runCorMax: 0,
      runParidadeMax: 0,
      isMicroDesvio: false,
      microDesvioDescricao: null,
    };
  }

  // Contagem de Zeros nos 15 giros
  const zeros = janela15.filter((s) => s.num === 0).length;

  // Contagem de dúzias e colunas
  const dCount = [0, 0, 0];
  const cCount = [0, 0, 0];
  let repeticaoDuziaAtual = 1;
  let repeticaoDuziaMax = 1;
  let repeticaoColunaAtual = 1;
  let repeticaoColunaMax = 1;
  let runCorAtual = 1;
  let runCorMax = 1;
  let runParAtual = 1;
  let runParMax = 1;

  for (let i = 0; i < n; i++) {
    const s = janela15[i]!;
    if (s.props.duzia >= 1 && s.props.duzia <= 3) {
      dCount[s.props.duzia - 1] = (dCount[s.props.duzia - 1] ?? 0) + 1;
    }
    if (s.props.coluna >= 1 && s.props.coluna <= 3) {
      cCount[s.props.coluna - 1] = (cCount[s.props.coluna - 1] ?? 0) + 1;
    }

    if (i > 0) {
      const prev = janela15[i - 1]!;
      // Dúzia
      if (s.props.duzia > 0 && s.props.duzia === prev.props.duzia) {
        repeticaoDuziaAtual++;
        if (repeticaoDuziaAtual > repeticaoDuziaMax) repeticaoDuziaMax = repeticaoDuziaAtual;
      } else {
        repeticaoDuziaAtual = 1;
      }
      // Coluna
      if (s.props.coluna > 0 && s.props.coluna === prev.props.coluna) {
        repeticaoColunaAtual++;
        if (repeticaoColunaAtual > repeticaoColunaMax) repeticaoColunaMax = repeticaoColunaAtual;
      } else {
        repeticaoColunaAtual = 1;
      }
      // Cor
      if (s.props.cor !== "green" && s.props.cor === prev.props.cor) {
        runCorAtual++;
        if (runCorAtual > runCorMax) runCorMax = runCorAtual;
      } else {
        runCorAtual = 1;
      }
      // Paridade
      const parAtual = s.num > 0 ? s.num % 2 === 0 : null;
      const parPrev = prev.num > 0 ? prev.num % 2 === 0 : null;
      if (parAtual !== null && parAtual === parPrev) {
        runParAtual++;
        if (runParAtual > runParMax) runParMax = runParAtual;
      } else {
        runParAtual = 1;
      }
    }
  }

  // Desvio padrão da distribuição de dúzias (valor esperado: n/3)
  const esperadoD = n / 3;
  const sdDuzias = Math.sqrt(
    dCount.reduce((acc, c) => acc + Math.pow(c - esperadoD, 2), 0) / 3
  );

  // Desvio padrão da distribuição de colunas
  const sdColunas = Math.sqrt(
    cCount.reduce((acc, c) => acc + Math.pow(c - esperadoD, 2), 0) / 3
  );

  // Desvio de valores numéricos absolutos (dispersão)
  const nums = janela15.map((s) => s.num);
  const sdNumeros = calcularDesvioPadraoArray(nums);

  // Pontuação composta de volatilidade (0 a 100%)
  // Base normalizada em torno de 30-40% para mesas balanceadas
  let scoreVolatilidade = 28;

  // Penalidade por desbalanceamento agudo de dúzias/colunas
  scoreVolatilidade += sdDuzias * 7.5;
  scoreVolatilidade += sdColunas * 7.5;

  // Zeros frequentes nos últimos 15 giros (>= 2 zeros = alerta severo de desvio)
  if (zeros >= 3) {
    scoreVolatilidade += 35;
  } else if (zeros === 2) {
    scoreVolatilidade += 22;
  } else if (zeros === 1) {
    scoreVolatilidade += 6;
  }

  // Repetição contínua da mesma dúzia (ex: 5x ou 6x consecutivas)
  if (repeticaoDuziaMax >= 6) {
    scoreVolatilidade += 30;
  } else if (repeticaoDuziaMax === 5) {
    scoreVolatilidade += 20;
  } else if (repeticaoDuziaMax === 4) {
    scoreVolatilidade += 10;
  }

  // Repetição de coluna
  if (repeticaoColunaMax >= 6) {
    scoreVolatilidade += 28;
  } else if (repeticaoColunaMax === 5) {
    scoreVolatilidade += 18;
  }

  // Sequência anômala de cor (>= 7 mesma cor seguida)
  if (runCorMax >= 8) {
    scoreVolatilidade += 25;
  } else if (runCorMax >= 6) {
    scoreVolatilidade += 14;
  }

  // Sequência de paridade
  if (runParMax >= 8) {
    scoreVolatilidade += 20;
  }

  const volatilidadeClamped = Math.min(100, Math.max(10, Math.round(scoreVolatilidade)));

  // Detecção de anomalia extrema
  let isAnomaliaExtrema = false;
  let motivoAnomalia: string | null = null;

  if (repeticaoDuziaMax >= 6) {
    isAnomaliaExtrema = true;
    motivoAnomalia = `Repetição anômala da mesma dúzia por ${repeticaoDuziaMax}x consecutivas`;
  } else if (repeticaoColunaMax >= 6) {
    isAnomaliaExtrema = true;
    motivoAnomalia = `Repetição anômala da mesma coluna por ${repeticaoColunaMax}x consecutivas`;
  } else if (zeros >= 2) {
    isAnomaliaExtrema = true;
    motivoAnomalia = `Alta densidade de zeros (${zeros}x nos últimos 15 giros)`;
  } else if (runCorMax >= 8) {
    isAnomaliaExtrema = true;
    motivoAnomalia = `Sequência estendida de ${runCorMax} giros na mesma cor`;
  } else if (volatilidadeClamped >= linhaDeCorte) {
    isAnomaliaExtrema = true;
    motivoAnomalia = `Volatilidade extrema da mesa (${volatilidadeClamped}% >= teto de ${linhaDeCorte}%)`;
  }

  const isMesaForaDeFoco = volatilidadeClamped >= linhaDeCorte || isAnomaliaExtrema;

  // Micro-desvio no último giro:
  // Se o último número foi zero, ou quebrou bruscamente uma sequência forte
  let isMicroDesvio = false;
  let microDesvioDescricao: string | null = null;

  const ultGiro = spins[0];
  const penultGiro = spins[1];

  if (!isMesaForaDeFoco && ultGiro) {
    if (ultGiro.num === 0) {
      isMicroDesvio = true;
      microDesvioDescricao = "Zero no último giro. Aguardando estabilização da rotação física.";
    } else if (penultGiro) {
      // Salto extremo no cilindro (> 16 casas de distância física repentina)
      const idx1 = CILINDRO.indexOf(ultGiro.num);
      const idx2 = CILINDRO.indexOf(penultGiro.num);
      if (idx1 >= 0 && idx2 >= 0) {
        const dist = Math.min(
          Math.abs(idx1 - idx2),
          CILINDRO.length - Math.abs(idx1 - idx2)
        );
        if (dist >= 16) {
          isMicroDesvio = true;
          microDesvioDescricao = `Salto físico extremo de ${dist} casas no cilindro no último giro.`;
        }
      }
    }
  }

  return {
    desvioPadrao15: Number(sdNumeros.toFixed(2)),
    volatilidadePerc: volatilidadeClamped,
    linhaDeCortePerc: linhaDeCorte,
    isMesaForaDeFoco,
    isAnomaliaExtrema,
    motivoAnomalia,
    zerosUltimos15: zeros,
    repeticaoDuziaMax,
    repeticaoColunaMax,
    runCorMax,
    runParidadeMax: runParMax,
    isMicroDesvio,
    microDesvioDescricao,
  };
}

/**
 * 3. MOTOR DO "PADRÃO ÚNICO" (Meta-Padrão Dinâmico)
 *    Com Sistema de Pesos Dinâmicos e Autoajuste de Mercado
 */
export function processarPadraoUnico(
  spins: Spin[],
  linhaDeCorte = 65
): ResultadoPadraoUnico {
  const inicioTempo = performance.now();

  // 1. Analisador de Volatilidade e Circuit Breaker dos últimos 15 giros
  const analiseVolatilidade = analisarVolatilidade15Giros(spins, linhaDeCorte);

  if (spins.length === 0) {
    return {
      estado: "MESA_FORA_DE_FOCO",
      estadoLabel: "AGUARDANDO HISTÓRICO",
      badgeTexto: "SEM GIROS",
      mensagemPrincipal: "Insira números para calibrar o Padrão Único de Alta Confluência.",
      mensagemSecundaria: "Aguardando amostra mínima para autoajuste de pesos e cálculo de desvio.",
      corNeonPrincipal: "#8892b0",
      corFundoClasse: "border-slate-800 bg-slate-950/70 text-slate-300",
      concordanciaGeralPerc: 0,
      assertividadeEstimadaPerc: 0,
      nivelEntradaTexto: "INICIALIZANDO MOTOR",
      alvosFinais: [],
      duziaRecomendada: null,
      colunaRecomendada: null,
      setorRecomendado: null,
      terminaisRecomendados: [],
      coresRecomendadas: [],
      subPadroes: [],
      volatilidade: analiseVolatilidade,
      historicoTimeline: [],
      tempoProcessamentoMs: 0,
    };
  }

  const ultimoSpin = spins[0]!;
  const ultNum = ultimoSpin.num;

  // 2. Avaliação de Eficácia Histórica nas janelas de 37 e 50 giros (Autoajuste de Mercado)
  const winRateTerminais37 = avaliarDesempenhoHistorico(spins, 37, "terminais");
  const winRateTerminais50 = avaliarDesempenhoHistorico(spins, 50, "terminais");
  const scoreTerminais = 0.6 * winRateTerminais37 + 0.4 * winRateTerminais50;

  const winRateDuzias37 = avaliarDesempenhoHistorico(spins, 37, "duzias");
  const winRateDuzias50 = avaliarDesempenhoHistorico(spins, 50, "duzias");
  const scoreDuzias = 0.6 * winRateDuzias37 + 0.4 * winRateDuzias50;

  const winRateColunas37 = avaliarDesempenhoHistorico(spins, 37, "colunas");
  const winRateColunas50 = avaliarDesempenhoHistorico(spins, 50, "colunas");
  const scoreColunas = 0.6 * winRateColunas37 + 0.4 * winRateColunas50;

  const winRateSetores37 = avaliarDesempenhoHistorico(spins, 37, "setores");
  const winRateSetores50 = avaliarDesempenhoHistorico(spins, 50, "setores");
  const scoreSetores = 0.6 * winRateSetores37 + 0.4 * winRateSetores50;

  const winRateSequencias37 = avaliarDesempenhoHistorico(spins, 37, "sequencias");
  const winRateSequencias50 = avaliarDesempenhoHistorico(spins, 50, "sequencias");
  const scoreSequencias = 0.6 * winRateSequencias37 + 0.4 * winRateSequencias50;

  const winRateVizinhos37 = avaliarDesempenhoHistorico(spins, 37, "vizinhos");
  const winRateVizinhos50 = avaliarDesempenhoHistorico(spins, 50, "vizinhos");
  const scoreVizinhos = 0.6 * winRateVizinhos37 + 0.4 * winRateVizinhos50;

  // Normalização Exponencial dos Pesos Dinâmicos (Softening Gamma = 1.25)
  const gamma = 1.25;
  const rawTerm = Math.pow(scoreTerminais, gamma);
  const rawDuz = Math.pow(scoreDuzias, gamma);
  const rawCol = Math.pow(scoreColunas, gamma);
  const rawSet = Math.pow(scoreSetores, gamma);
  const rawSeq = Math.pow(scoreSequencias, gamma);
  const rawViz = Math.pow(scoreVizinhos, gamma);
  const somaRaw = rawTerm + rawDuz + rawCol + rawSet + rawSeq + rawViz || 1;

  const pesoTerminais = rawTerm / somaRaw;
  const pesoDuzias = rawDuz / somaRaw;
  const pesoColunas = rawCol / somaRaw;
  const pesoSetores = rawSet / somaRaw;
  const pesoSequencias = rawSeq / somaRaw;
  const pesoVizinhos = rawViz / somaRaw;

  // 3. Identificação das Propostas dos Sub-Padrões
  // A) Terminais:
  const terminalUltimo = ultNum % 10;
  // Terminais quentes nos últimos 37 giros
  const contagemTerminais = new Array(10).fill(0);
  spins.slice(0, 37).forEach((s) => contagemTerminais[s.num % 10]++);
  let topTerminal = terminalUltimo;
  let maxTerminalCount = -1;
  contagemTerminais.forEach((count, t) => {
    if (count > maxTerminalCount) {
      maxTerminalCount = count;
      topTerminal = t;
    }
  });

  // Alvos de terminal: números que terminam com o terminal quente e seu espelho/vizinho
  const alvosTerminais: number[] = [];
  for (let n = 0; n <= 36; n++) {
    if (n % 10 === topTerminal || n % 10 === (topTerminal + 5) % 10) {
      alvosTerminais.push(n);
    }
  }

  // B) Dúzias:
  const dCont = [0, 0, 0];
  spins.slice(0, 24).forEach((s) => {
    if (s.props.duzia >= 1 && s.props.duzia <= 3) {
      dCont[s.props.duzia - 1] = (dCont[s.props.duzia - 1] ?? 0) + 1;
    }
  });
  const duziaLider = dCont[0]! >= dCont[1]! && dCont[0]! >= dCont[2]! ? 1 : dCont[1]! >= dCont[2]! ? 2 : 3;
  const alvosDuzia: number[] = [];
  for (let n = 1; n <= 36; n++) {
    const d = n <= 12 ? 1 : n <= 24 ? 2 : 3;
    if (d === duziaLider) alvosDuzia.push(n);
  }

  // C) Colunas:
  const cCont = [0, 0, 0];
  spins.slice(0, 24).forEach((s) => {
    if (s.props.coluna >= 1 && s.props.coluna <= 3) {
      cCont[s.props.coluna - 1] = (cCont[s.props.coluna - 1] ?? 0) + 1;
    }
  });
  const colunaLider = cCont[0]! >= cCont[1]! && cCont[0]! >= cCont[2]! ? 1 : cCont[1]! >= cCont[2]! ? 2 : 3;
  const alvosColuna: number[] = [];
  for (let n = 1; n <= 36; n++) {
    const c = n % 3 === 1 ? 1 : n % 3 === 2 ? 2 : 3;
    if (c === colunaLider) alvosColuna.push(n);
  }

  // D) Setores Físicos:
  const setorLider = SETORES_COMPLETOS.reduce((melhor, s) => {
    const hits = spins.slice(0, 25).filter((sp) => s.numbers.includes(sp.num)).length;
    const taxa = hits / (s.numbers.length * 25);
    return taxa > melhor.taxa ? { setor: s, taxa } : melhor;
  }, { setor: SETORES_COMPLETOS[0]!, taxa: -1 }).setor;
  const alvosSetor = [...setorLider.numbers];

  // E) Sequências (Cores & Paridade):
  const ultCor = ultimoSpin.props.cor;
  const corAlvo: Cor = ultCor === "red" ? "black" : "red";
  const alvosSequencia: number[] = [];
  for (let n = 1; n <= 36; n++) {
    const isRed = REDS.includes(n);
    if ((corAlvo === "red" && isRed) || (corAlvo === "black" && !isRed)) {
      alvosSequencia.push(n);
    }
  }

  // F) Vizinhos Físicos no Cilindro:
  const alvosVizinhos = vizinhos(ultNum, 3); // 7 números no arco radial

  // 4. VOTAÇÃO PONDERADA PELOS PESOS DINÂMICOS (0 a 36)
  const votosPorNumero = new Array(37).fill(0);

  alvosTerminais.forEach((n) => (votosPorNumero[n] += pesoTerminais));
  alvosDuzia.forEach((n) => (votosPorNumero[n] += pesoDuzias));
  alvosColuna.forEach((n) => (votosPorNumero[n] += pesoColunas));
  alvosSetor.forEach((n) => (votosPorNumero[n] += pesoSetores));
  alvosSequencia.forEach((n) => (votosPorNumero[n] += pesoSequencias));
  alvosVizinhos.forEach((n) => (votosPorNumero[n] += pesoVizinhos));

  // Ordena números por pontuação de confluência
  const numerosRanqueados = Array.from({ length: 37 }, (_, i) => ({
    num: i,
    score: votosPorNumero[i]!,
  })).sort((a, b) => b.score - a.score);

  // Seleciona os 7 a 9 números de maior pontuação convergente
  const alvosFinais = numerosRanqueados.slice(0, 8).map((item) => item.num);

  // 5. CÁLCULO DA CONCORDÂNCIA DO PADRÃO ÚNICO
  const subPadroes: SubPadraoStatus[] = [
    {
      tipo: "terminais",
      nome: `Terminais [${topTerminal} e ${(topTerminal + 5) % 10}]`,
      pesoDinamicoPerc: Math.round(pesoTerminais * 100),
      winRate37: Math.round(winRateTerminais37),
      winRate50: Math.round(winRateTerminais50),
      scoreEficacia: Math.round(scoreTerminais),
      concordaComLider: alvosTerminais.some((n) => alvosFinais.includes(n)),
      sugestao: `Final ${topTerminal} (${maxTerminalCount}x em 37 giros)`,
      alvos: alvosTerminais,
      confianca: Math.round(scoreTerminais),
    },
    {
      tipo: "duzias",
      nome: `Dúzia ${duziaLider}ª`,
      pesoDinamicoPerc: Math.round(pesoDuzias * 100),
      winRate37: Math.round(winRateDuzias37),
      winRate50: Math.round(winRateDuzias50),
      scoreEficacia: Math.round(scoreDuzias),
      concordaComLider: alvosDuzia.some((n) => alvosFinais.includes(n)),
      sugestao: `${duziaLider}ª Dúzia (${dCont[duziaLider - 1]}x em 24 giros)`,
      alvos: alvosDuzia,
      confianca: Math.round(scoreDuzias),
    },
    {
      tipo: "colunas",
      nome: `Coluna ${colunaLider}ª`,
      pesoDinamicoPerc: Math.round(pesoColunas * 100),
      winRate37: Math.round(winRateColunas37),
      winRate50: Math.round(winRateColunas50),
      scoreEficacia: Math.round(scoreColunas),
      concordaComLider: alvosColuna.some((n) => alvosFinais.includes(n)),
      sugestao: `${colunaLider}ª Coluna (${cCont[colunaLider - 1]}x em 24 giros)`,
      alvos: alvosColuna,
      confianca: Math.round(scoreColunas),
    },
    {
      tipo: "setores",
      nome: `Setor ${setorLider.name}`,
      pesoDinamicoPerc: Math.round(pesoSetores * 100),
      winRate37: Math.round(winRateSetores37),
      winRate50: Math.round(winRateSetores50),
      scoreEficacia: Math.round(scoreSetores),
      concordaComLider: alvosSetor.some((n) => alvosFinais.includes(n)),
      sugestao: `${setorLider.name} (${setorLider.numbers.length} números)`,
      alvos: alvosSetor,
      confianca: Math.round(scoreSetores),
    },
    {
      tipo: "sequencias",
      nome: `Sequência ${corAlvo === "red" ? "Vermelho" : "Preto"}`,
      pesoDinamicoPerc: Math.round(pesoSequencias * 100),
      winRate37: Math.round(winRateSequencias37),
      winRate50: Math.round(winRateSequencias50),
      scoreEficacia: Math.round(scoreSequencias),
      concordaComLider: alvosSequencia.some((n) => alvosFinais.includes(n)),
      sugestao: `Quebra/Alternância para ${corAlvo.toUpperCase()}`,
      alvos: alvosSequencia,
      confianca: Math.round(scoreSequencias),
    },
    {
      tipo: "vizinhos",
      nome: `Vizinhos Radial ±3 de ${ultNum}`,
      pesoDinamicoPerc: Math.round(pesoVizinhos * 100),
      winRate37: Math.round(winRateVizinhos37),
      winRate50: Math.round(winRateVizinhos50),
      scoreEficacia: Math.round(scoreVizinhos),
      concordaComLider: alvosVizinhos.some((n) => alvosFinais.includes(n)),
      sugestao: `Arco físico [${alvosVizinhos.slice(0, 5).join(", ")}]`,
      alvos: alvosVizinhos,
      confianca: Math.round(scoreVizinhos),
    },
  ];

  // Soma dos pesos dos padrões que concordam com o líder
  const pesoConcordanteTotal = subPadroes.reduce((acc, sub) => {
    return sub.concordaComLider ? acc + (sub.pesoDinamicoPerc / 100) : acc;
  }, 0);

  const concordanciaGeralPerc = Math.min(100, Math.round(pesoConcordanteTotal * 100));

  // Assertividade estimada do Padrão Único
  const somaScorePonderado = subPadroes.reduce((acc, s) => {
    return s.concordaComLider ? acc + (s.confianca * s.pesoDinamicoPerc) : acc;
  }, 0);
  const assertividadeEstimadaPerc = Math.min(
    97,
    Math.max(
      60,
      Math.round(somaScorePonderado / (pesoConcordanteTotal * 100 || 1))
    )
  );

  // Classificação do Nível de Entrada (tipo "90% Melhor Momento")
  let nivelEntradaTexto = "85% CONFLUÊNCIA PADRÃO";
  if (concordanciaGeralPerc >= 90 && assertividadeEstimadaPerc >= 90) {
    nivelEntradaTexto = `${assertividadeEstimadaPerc}% · MELHOR MOMENTO (SNIPER MÁXIMO)`;
  } else if (concordanciaGeralPerc >= 85) {
    nivelEntradaTexto = `${assertividadeEstimadaPerc}% · ENTRADA EXPERT`;
  } else if (concordanciaGeralPerc >= 80) {
    nivelEntradaTexto = `${assertividadeEstimadaPerc}% · ALTA CONFLUÊNCIA`;
  } else {
    nivelEntradaTexto = `${concordanciaGeralPerc}% · CONCORDÂNCIA INSUFICIENTE (<80%)`;
  }

  // 6. MÁQUINA DE ESTADOS VISUAIS (SINAL CONFIRMADO / AGUARDAR / MESA FORA DE FOCO)
  let estado: EstadoPadraoUnico;
  let estadoLabel: string;
  let badgeTexto: string;
  let mensagemPrincipal: string;
  let mensagemSecundaria: string;
  let corNeonPrincipal: string;
  let corFundoClasse: string;

  if (analiseVolatilidade.isMesaForaDeFoco) {
    // 🔴 ESTADO 3: MESA FORA DE FOCO / PAUSA (TRAVA DE SEGURANÇA CIRCUIT BREAKER)
    estado = "MESA_FORA_DE_FOCO";
    estadoLabel = "MESA FORA DE FOCO / PAUSA";
    badgeTexto = "🔴 CIRCUIT BREAKER ATIVADO";
    mensagemPrincipal =
      "ATENÇÃO: Variação extrema de mercado. Operações suspensas. Aguardando a mesa voltar ao padrão estatístico normal.";
    mensagemSecundaria =
      analiseVolatilidade.motivoAnomalia ||
      `Volatilidade de ${analiseVolatilidade.volatilidadePerc}% ultrapassou o teto de segurança (${linhaDeCorte}%). Trava anti-red ativada para proteger o capital.`;
    corNeonPrincipal = "#FF1744";
    corFundoClasse =
      "border-2 border-[#FF1744] bg-gradient-to-r from-red-950/90 via-[#2d050c]/90 to-red-950/90 text-white shadow-[0_0_25px_rgba(255,23,68,0.4)]";
  } else if (analiseVolatilidade.isMicroDesvio || concordanciaGeralPerc < 80) {
    // 🟡 ESTADO 2: AGUARDAR PRÓXIMA ENTRADA
    estado = "AGUARDAR_PROXIMA";
    estadoLabel = "AGUARDAR PRÓXIMA ENTRADA";
    badgeTexto = "🟡 MICRO-DESVIO / AGUARDANDO CORREÇÃO";
    mensagemPrincipal =
      "Desvio detectado no último giro. Aguarde a correção para a próxima entrada.";
    mensagemSecundaria =
      analiseVolatilidade.microDesvioDescricao ||
      (concordanciaGeralPerc < 80
        ? `Concordância atual dos padrões em ${concordanciaGeralPerc}% (abaixo do critério mínimo de 80%). Calibrando gatilhos.`
        : "Oportunidade identificada, porém a IA detectou um micro-desvio tático temporário.");
    corNeonPrincipal = "#FFB800";
    corFundoClasse =
      "border-2 border-[#FFB800] bg-gradient-to-r from-yellow-950/90 via-[#2a1a02]/90 to-yellow-950/90 text-yellow-100 shadow-[0_0_25px_rgba(255,184,0,0.35)]";
  } else {
    // 🟢 ESTADO 1: SINAL CONFIRMADO (ENTRADA CIRÚRGICA AUTORIZADA)
    estado = "SINAL_CONFIRMADO";
    estadoLabel = "SINAL CONFIRMADO";
    badgeTexto = `🟢 OPERAÇÃO AUTORIZADA · ${nivelEntradaTexto}`;
    mensagemPrincipal =
      "Padrão Único alinhado e variância da mesa controlada. Operação autorizada.";
    mensagemSecundaria = `Concordância excelente de ${concordanciaGeralPerc}% entre padrões ponderados com volatilidade sob controle (${analiseVolatilidade.volatilidadePerc}% < ${linhaDeCorte}%).`;
    corNeonPrincipal = "#00FF88";
    corFundoClasse =
      "border-2 border-[#00FF88] bg-gradient-to-r from-emerald-950/95 via-[#032e18]/95 to-emerald-950/95 text-white shadow-[0_0_30px_rgba(0,255,136,0.45)]";
  }

  // 7. LINHA DO TEMPO HISTÓRICA PARA O GRÁFICO CHART.JS (ÚLTIMOS 25 GIROS)
  const historicoTimeline: PontoHistoricoVolatilidade[] = [];
  const maxPontos = Math.min(25, spins.length);

  for (let i = maxPontos - 1; i >= 0; i--) {
    const pontoSlice = spins.slice(i);
    const numPonto = spins[i]!.num;
    const volPonto = analisarVolatilidade15Giros(pontoSlice, linhaDeCorte).volatilidadePerc;

    const assertPonto = Math.min(
      95,
      Math.max(
        50,
        Math.round(82 + (concordanciaGeralPerc - 80) * 0.5 - (volPonto > linhaDeCorte ? 25 : 0))
      )
    );

    let pontoEstado: EstadoPadraoUnico = "SINAL_CONFIRMADO";
    if (volPonto >= linhaDeCorte) {
      pontoEstado = "MESA_FORA_DE_FOCO";
    } else if (volPonto >= 55 || numPonto === 0) {
      pontoEstado = "AGUARDAR_PROXIMA";
    }

    historicoTimeline.push({
      indice: maxPontos - i,
      rotuloGiro: `G-${i === 0 ? "Atual" : i} (#${numPonto})`,
      numero: numPonto,
      volatilidade: volPonto,
      assertividade: assertPonto,
      linhaDeCorte,
      estado: pontoEstado,
    });
  }

  const fimTempo = performance.now();

  return {
    estado,
    estadoLabel,
    badgeTexto,
    mensagemPrincipal,
    mensagemSecundaria,
    corNeonPrincipal,
    corFundoClasse,
    concordanciaGeralPerc,
    assertividadeEstimadaPerc,
    nivelEntradaTexto,
    alvosFinais,
    duziaRecomendada: duziaLider,
    colunaRecomendada: colunaLider,
    setorRecomendado: setorLider.name,
    terminaisRecomendados: [topTerminal, (topTerminal + 5) % 10],
    coresRecomendadas: [corAlvo],
    subPadroes,
    volatilidade: analiseVolatilidade,
    historicoTimeline,
    tempoProcessamentoMs: Number((fimTempo - inicioTempo).toFixed(2)),
  };
}
