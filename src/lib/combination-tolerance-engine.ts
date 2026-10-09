/**
 * MOTOR DE FREQUÊNCIAS GRÁFICAS & TOLERÂNCIA DE COMBINAÇÕES
 * Avalia matematicamente a tolerância de até 2 entradas (G1) entre:
 * 1. Dúzia e Dúzia (2 Terços - 24 números / 64.8%)
 * 2. Coluna e Coluna (2 Colunas - 24 números / 64.8%)
 * 3. Dúzia e Coluna (Interseção 4 números + Cobertura 20 números / 54.1%)
 *
 * Aplica a curva de tolerância dos gráficos operacionais:
 * - Cada acerto soma +1 ponto e zera os erros acumulados.
 * - 2 erros consecutivos aplicam penalidade de -1 ponto (quebra de tolerância G1).
 * Identifica rigorosamente qual é a MELHOR combinação em até 2 entradas.
 */

export type TipoCombinacao = "DUZIA_COLUNA" | "DUZIA_DUZIA" | "COLUNA_COLUNA";

export interface PontoCurvaTolerancia {
  rodadaIndex: number;
  numero: number;
  pontos: number;
  isHit: boolean;
  isDoubleHit: boolean;
  errosAcumulados: number;
}

export interface CombinacaoToleranciaItem {
  id: string;
  nome: string;
  tipo: TipoCombinacao;
  tipoLabel: string;
  descricao: string;
  duzias: (1 | 2 | 3)[];
  colunas: (1 | 2 | 3)[];
  alvos: number[];
  alvosIntersecao?: number[] | undefined;
  totalAlvos: number;
  coberturaPerc: number;

  // Métricas de Tolerância de 2 Erros / Até 2 Entradas (G1)
  totalCiclos: number;
  acertosG0: number; // Direto na 1ª entrada
  acertosG1: number; // Na 2ª entrada (proteção / tolerância)
  totalGreensG1: number; // G0 + G1
  totalRedsG1: number; // 2 erros seguidos (quebra de tolerância)
  taxaG1: number; // (totalGreensG1 / totalCiclos) * 100

  // Pontuação Gráfica com Tolerância (+1 acerto, -1 a cada 2 erros)
  pontosTolerancia: number;
  totalPenalidades: number;
  curvaTolerancia: PontoCurvaTolerancia[];

  // Sequências e Estado Atual
  sequenciaGreensAtual: number;
  maiorSequenciaGreens: number;
  statusAtual: "STANDBY" | "ENTRADA_1" | "PROTECAO_G1" | "ALTA_ASSERTIVIDADE";
  recomendacaoTatica: string;
}

export interface CombinacaoToleranciaResultado {
  melhorGlobal: CombinacaoToleranciaItem;
  melhorDuziaColuna: CombinacaoToleranciaItem;
  melhorDuziaDuzia: CombinacaoToleranciaItem;
  melhorColunaColuna: CombinacaoToleranciaItem;
  todasCombinacoes: CombinacaoToleranciaItem[];
  amostraTamanho: number;
}

// Definições de Dúzias (1, 2, 3)
const NUMEROS_DUZIA: Record<1 | 2 | 3, number[]> = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  2: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  3: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
};

// Definições de Colunas (1, 2, 3)
const NUMEROS_COLUNA: Record<1 | 2 | 3, number[]> = {
  1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
};

function intersectarArrays(a: number[], b: number[]): number[] {
  const setB = new Set(b);
  return a.filter((n) => setB.has(n));
}

function unirArrays(a: number[], b: number[]): number[] {
  return Array.from(new Set([...a, ...b])).sort((x, y) => x - y);
}

interface DefinicaoCombinacao {
  id: string;
  nome: string;
  tipo: TipoCombinacao;
  tipoLabel: string;
  descricao: string;
  duzias: (1 | 2 | 3)[];
  colunas: (1 | 2 | 3)[];
  alvos: number[];
  alvosIntersecao?: number[] | undefined;
  coberturaPerc: number;
}

const DEFINICOES_COMBINACOES: DefinicaoCombinacao[] = [
  // 1. DÚZIA + DÚZIA (2 TERÇOS)
  {
    id: "duz_1_2",
    nome: "1ª Dúzia + 2ª Dúzia (1-24)",
    tipo: "DUZIA_DUZIA",
    tipoLabel: "Dúzia + Dúzia",
    descricao: "Cobertura de 2 Terços inferiores cobrindo números do 1 ao 24.",
    duzias: [1, 2],
    colunas: [],
    alvos: unirArrays(NUMEROS_DUZIA[1], NUMEROS_DUZIA[2]),
    coberturaPerc: 64.86,
  },
  {
    id: "duz_1_3",
    nome: "1ª Dúzia + 3ª Dúzia (Extremos)",
    tipo: "DUZIA_DUZIA",
    tipoLabel: "Dúzia + Dúzia",
    descricao: "Cobertura de 2 Terços extremos cobrindo 1-12 e 25-36.",
    duzias: [1, 3],
    colunas: [],
    alvos: unirArrays(NUMEROS_DUZIA[1], NUMEROS_DUZIA[3]),
    coberturaPerc: 64.86,
  },
  {
    id: "duz_2_3",
    nome: "2ª Dúzia + 3ª Dúzia (13-36)",
    tipo: "DUZIA_DUZIA",
    tipoLabel: "Dúzia + Dúzia",
    descricao: "Cobertura de 2 Terços superiores cobrindo números do 13 ao 36.",
    duzias: [2, 3],
    colunas: [],
    alvos: unirArrays(NUMEROS_DUZIA[2], NUMEROS_DUZIA[3]),
    coberturaPerc: 64.86,
  },

  // 2. COLUNA + COLUNA (2 COLUNAS)
  {
    id: "col_1_2",
    nome: "1ª Coluna + 2ª Coluna",
    tipo: "COLUNA_COLUNA",
    tipoLabel: "Coluna + Coluna",
    descricao: "Cobertura de 2 Colunas (mod 3 = 1 e 2), cobrindo 24 números.",
    duzias: [],
    colunas: [1, 2],
    alvos: unirArrays(NUMEROS_COLUNA[1], NUMEROS_COLUNA[2]),
    coberturaPerc: 64.86,
  },
  {
    id: "col_1_3",
    nome: "1ª Coluna + 3ª Coluna",
    tipo: "COLUNA_COLUNA",
    tipoLabel: "Coluna + Coluna",
    descricao: "Cobertura de 2 Colunas externas (mod 3 = 1 e 0), cobrindo 24 números.",
    duzias: [],
    colunas: [1, 3],
    alvos: unirArrays(NUMEROS_COLUNA[1], NUMEROS_COLUNA[3]),
    coberturaPerc: 64.86,
  },
  {
    id: "col_2_3",
    nome: "2ª Coluna + 3ª Coluna",
    tipo: "COLUNA_COLUNA",
    tipoLabel: "Coluna + Coluna",
    descricao: "Cobertura de 2 Colunas altas (mod 3 = 2 e 0), cobrindo 24 números.",
    duzias: [],
    colunas: [2, 3],
    alvos: unirArrays(NUMEROS_COLUNA[2], NUMEROS_COLUNA[3]),
    coberturaPerc: 64.86,
  },

  // 3. DÚZIA + COLUNA (INTERSEÇÃO & COBERTURA TÁTICA)
  {
    id: "duz1_col1",
    nome: "1ª Dúzia + 1ª Coluna",
    tipo: "DUZIA_COLUNA",
    tipoLabel: "Dúzia + Coluna",
    descricao: "Cruzamento tático com 4 alvos de interseção de ouro.",
    duzias: [1],
    colunas: [1],
    alvos: unirArrays(NUMEROS_DUZIA[1], NUMEROS_COLUNA[1]),
    alvosIntersecao: intersectarArrays(NUMEROS_DUZIA[1], NUMEROS_COLUNA[1]),
    coberturaPerc: 54.05,
  },
  {
    id: "duz1_col2",
    nome: "1ª Dúzia + 2ª Coluna",
    tipo: "DUZIA_COLUNA",
    tipoLabel: "Dúzia + Coluna",
    descricao: "Cruzamento tático com 4 alvos de interseção de ouro.",
    duzias: [1],
    colunas: [2],
    alvos: unirArrays(NUMEROS_DUZIA[1], NUMEROS_COLUNA[2]),
    alvosIntersecao: intersectarArrays(NUMEROS_DUZIA[1], NUMEROS_COLUNA[2]),
    coberturaPerc: 54.05,
  },
  {
    id: "duz1_col3",
    nome: "1ª Dúzia + 3ª Coluna",
    tipo: "DUZIA_COLUNA",
    tipoLabel: "Dúzia + Coluna",
    descricao: "Cruzamento tático com 4 alvos de interseção de ouro.",
    duzias: [1],
    colunas: [3],
    alvos: unirArrays(NUMEROS_DUZIA[1], NUMEROS_COLUNA[3]),
    alvosIntersecao: intersectarArrays(NUMEROS_DUZIA[1], NUMEROS_COLUNA[3]),
    coberturaPerc: 54.05,
  },
  {
    id: "duz2_col1",
    nome: "2ª Dúzia + 1ª Coluna",
    tipo: "DUZIA_COLUNA",
    tipoLabel: "Dúzia + Coluna",
    descricao: "Cruzamento tático com 4 alvos de interseção de ouro.",
    duzias: [2],
    colunas: [1],
    alvos: unirArrays(NUMEROS_DUZIA[2], NUMEROS_COLUNA[1]),
    alvosIntersecao: intersectarArrays(NUMEROS_DUZIA[2], NUMEROS_COLUNA[1]),
    coberturaPerc: 54.05,
  },
  {
    id: "duz2_col2",
    nome: "2ª Dúzia + 2ª Coluna",
    tipo: "DUZIA_COLUNA",
    tipoLabel: "Dúzia + Coluna",
    descricao: "Cruzamento tático com 4 alvos de interseção de ouro.",
    duzias: [2],
    colunas: [2],
    alvos: unirArrays(NUMEROS_DUZIA[2], NUMEROS_COLUNA[2]),
    alvosIntersecao: intersectarArrays(NUMEROS_DUZIA[2], NUMEROS_COLUNA[2]),
    coberturaPerc: 54.05,
  },
  {
    id: "duz2_col3",
    nome: "2ª Dúzia + 3ª Coluna",
    tipo: "DUZIA_COLUNA",
    tipoLabel: "Dúzia + Coluna",
    descricao: "Cruzamento tático com 4 alvos de interseção de ouro.",
    duzias: [2],
    colunas: [3],
    alvos: unirArrays(NUMEROS_DUZIA[2], NUMEROS_COLUNA[3]),
    alvosIntersecao: intersectarArrays(NUMEROS_DUZIA[2], NUMEROS_COLUNA[3]),
    coberturaPerc: 54.05,
  },
  {
    id: "duz3_col1",
    nome: "3ª Dúzia + 1ª Coluna",
    tipo: "DUZIA_COLUNA",
    tipoLabel: "Dúzia + Coluna",
    descricao: "Cruzamento tático com 4 alvos de interseção de ouro.",
    duzias: [3],
    colunas: [1],
    alvos: unirArrays(NUMEROS_DUZIA[3], NUMEROS_COLUNA[1]),
    alvosIntersecao: intersectarArrays(NUMEROS_DUZIA[3], NUMEROS_COLUNA[1]),
    coberturaPerc: 54.05,
  },
  {
    id: "duz3_col2",
    nome: "3ª Dúzia + 2ª Coluna",
    tipo: "DUZIA_COLUNA",
    tipoLabel: "Dúzia + Coluna",
    descricao: "Cruzamento tático com 4 alvos de interseção de ouro.",
    duzias: [3],
    colunas: [2],
    alvos: unirArrays(NUMEROS_DUZIA[3], NUMEROS_COLUNA[2]),
    alvosIntersecao: intersectarArrays(NUMEROS_DUZIA[3], NUMEROS_COLUNA[2]),
    coberturaPerc: 54.05,
  },
  {
    id: "duz3_col3",
    nome: "3ª Dúzia + 3ª Coluna",
    tipo: "DUZIA_COLUNA",
    tipoLabel: "Dúzia + Coluna",
    descricao: "Cruzamento tático com 4 alvos de interseção de ouro.",
    duzias: [3],
    colunas: [3],
    alvos: unirArrays(NUMEROS_DUZIA[3], NUMEROS_COLUNA[3]),
    alvosIntersecao: intersectarArrays(NUMEROS_DUZIA[3], NUMEROS_COLUNA[3]),
    coberturaPerc: 54.05,
  },
];

/**
 * Avalia uma combinação específica sobre a sequência cronológica de números,
 * simulando exatamente a curva de pontuação gráfica com tolerância de 2 erros
 * e calculando a taxa de assertividade em até 2 entradas (G1).
 */
function avaliarCombinacao(
  def: DefinicaoCombinacao,
  numerosCronologicos: number[]
): CombinacaoToleranciaItem {
  const setAlvos = new Set(def.alvos);
  const setIntersecao = def.alvosIntersecao ? new Set(def.alvosIntersecao) : null;

  let pontos = 0;
  let errosConsecutivos = 0;
  let totalPenalidades = 0;

  let acertosG0 = 0;
  let acertosG1 = 0;
  let totalRedsG1 = 0;
  let totalCiclos = 0;

  let sequenciaGreensAtual = 0;
  let maiorSequenciaGreens = 0;

  // Estado da simulação de ciclos G1:
  // entradaEmCurso: 0 = fora de aposta (inicia nova), 1 = esperando 2ª entrada (G1)
  let estadoCiclo = 0;

  const curvaTolerancia: PontoCurvaTolerancia[] = [];

  numerosCronologicos.forEach((num, idx) => {
    const isHit = setAlvos.has(num);
    const isDoubleHit = setIntersecao !== null && setIntersecao.has(num);

    // =========================================================================
    // 1. CURVA GRÁFICA DE PONTUAÇÃO COM TOLERÂNCIA DE 2 ERROS
    // (Padrão rigoroso dos gráficos de Dúzia/Coluna: acerto = +1, 2 erros = -1)
    // =========================================================================
    if (isHit) {
      pontos += isDoubleHit ? 2 : 1; // Interseção de ouro dá bônus duplo
      errosConsecutivos = 0; // Acerto zera erros acumulados
    } else {
      errosConsecutivos += 1;
      if (errosConsecutivos >= 2) {
        pontos -= 1; // Penalidade por quebra da tolerância de 2 erros
        errosConsecutivos = 0;
        totalPenalidades += 1;
      }
    }

    curvaTolerancia.push({
      rodadaIndex: idx + 1,
      numero: num,
      pontos,
      isHit,
      isDoubleHit,
      errosAcumulados: errosConsecutivos,
    });

    // =========================================================================
    // 2. CICLOS DE ATÉ 2 ENTRADAS (G0 E G1)
    // =========================================================================
    if (estadoCiclo === 0) {
      // Início de novo ciclo (1ª Entrada - G0)
      totalCiclos += 1;
      if (isHit) {
        acertosG0 += 1;
        sequenciaGreensAtual += 1;
        if (sequenciaGreensAtual > maiorSequenciaGreens) {
          maiorSequenciaGreens = sequenciaGreensAtual;
        }
        estadoCiclo = 0; // Ciclo finalizado com Green imediato!
      } else {
        // Errou na 1ª entrada -> Avança para 2ª entrada (G1 com tolerância)
        estadoCiclo = 1;
      }
    } else {
      // 2ª Entrada (G1 - Tolerância de 1 erro anterior)
      if (isHit) {
        acertosG1 += 1;
        sequenciaGreensAtual += 1;
        if (sequenciaGreensAtual > maiorSequenciaGreens) {
          maiorSequenciaGreens = sequenciaGreensAtual;
        }
        estadoCiclo = 0; // Ciclo salvo no G1!
      } else {
        // Errou novamente -> 2 erros consecutivos = Quebra de Tolerância (RED)
        totalRedsG1 += 1;
        sequenciaGreensAtual = 0;
        estadoCiclo = 0; // Ciclo encerrado com Red
      }
    }
  });

  const totalGreensG1 = acertosG0 + acertosG1;
  const taxaG1 = totalCiclos > 0 ? (totalGreensG1 / totalCiclos) * 100 : 0;

  // Status tático
  let statusAtual: CombinacaoToleranciaItem["statusAtual"] = "STANDBY";
  if (taxaG1 >= 80 && pontos >= 2) {
    statusAtual = "ALTA_ASSERTIVIDADE";
  } else if (estadoCiclo === 1) {
    statusAtual = "PROTECAO_G1";
  } else {
    statusAtual = "ENTRADA_1";
  }

  const recomendacaoTatica =
    taxaG1 >= 85
      ? `Alta confluência gráfica: ${taxaG1.toFixed(0)}% de acerto em até 2 entradas com ${pontos} pts acumulados.`
      : taxaG1 >= 70
      ? `Tendência favorável com ${taxaG1.toFixed(0)}% G1 e tolerância ativa (${acertosG0} direto + ${acertosG1} G1).`
      : `Oscilação moderada (${taxaG1.toFixed(0)}% G1). Monitorar estabilização da curva.`;

  return {
    id: def.id,
    nome: def.nome,
    tipo: def.tipo,
    tipoLabel: def.tipoLabel,
    descricao: def.descricao,
    duzias: def.duzias,
    colunas: def.colunas,
    alvos: def.alvos,
    alvosIntersecao: def.alvosIntersecao,
    totalAlvos: def.alvos.length,
    coberturaPerc: def.coberturaPerc,
    totalCiclos,
    acertosG0,
    acertosG1,
    totalGreensG1,
    totalRedsG1,
    taxaG1,
    pontosTolerancia: pontos,
    totalPenalidades,
    curvaTolerancia,
    sequenciaGreensAtual,
    maiorSequenciaGreens,
    statusAtual,
    recomendacaoTatica,
  };
}

/**
 * Função principal: Processa todas as 15 combinações e isola a MELHOR combinação
 * em até 2 entradas (G1) e com maior pontuação gráfica na curva de tolerância.
 */
export function analisarCombinacoesTolerancia(
  numeros: number[],
  sampleSize = 25
): CombinacaoToleranciaResultado {
  // Se a lista vier em ordem inversa (mais recente no índice 0), invertemos para cronológica
  const sliceNumeros = numeros.slice(0, Math.max(10, Math.min(50, sampleSize)));
  const cronologicos = [...sliceNumeros].reverse();

  // Avalia todas as 15 combinações
  const avaliadas = DEFINICOES_COMBINACOES.map((def) =>
    avaliarCombinacao(def, cronologicos)
  );

  // Função de ordenação:
  // 1. Maior Taxa G1 (%)
  // 2. Maior pontuação na curva de tolerância
  // 3. Menor volume de Reds G1
  // 4. Maior número de acertos diretos (G0)
  const ordenador = (a: CombinacaoToleranciaItem, b: CombinacaoToleranciaItem) => {
    if (b.taxaG1 !== a.taxaG1) {
      return b.taxaG1 - a.taxaG1;
    }
    if (b.pontosTolerancia !== a.pontosTolerancia) {
      return b.pontosTolerancia - a.pontosTolerancia;
    }
    if (a.totalRedsG1 !== b.totalRedsG1) {
      return a.totalRedsG1 - b.totalRedsG1;
    }
    return b.acertosG0 - a.acertosG0;
  };

  const ordenadasGeral = [...avaliadas].sort(ordenador);
  const ordenadasDuziaColuna = avaliadas
    .filter((c) => c.tipo === "DUZIA_COLUNA")
    .sort(ordenador);
  const ordenadasDuziaDuzia = avaliadas
    .filter((c) => c.tipo === "DUZIA_DUZIA")
    .sort(ordenador);
  const ordenadasColunaColuna = avaliadas
    .filter((c) => c.tipo === "COLUNA_COLUNA")
    .sort(ordenador);

  return {
    melhorGlobal: ordenadasGeral[0]!,
    melhorDuziaColuna: ordenadasDuziaColuna[0]!,
    melhorDuziaDuzia: ordenadasDuziaDuzia[0]!,
    melhorColunaColuna: ordenadasColunaColuna[0]!,
    todasCombinacoes: ordenadasGeral,
    amostraTamanho: cronologicos.length,
  };
}
