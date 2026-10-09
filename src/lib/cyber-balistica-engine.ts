/**
 * Cyber Balística Engine - Motor Tático e Estatístico
 * Mapeamento e Cálculos Balísticos para Roleta Europeia
 */

export const CYBER_CILINDRO: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const CYBER_REDS: number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

export interface BaseKpiMetric {
  labelA: string;
  countA: number;
  percA: number;
  labelB: string;
  countB: number;
  percB: number;
}

export interface GroupKpiItem {
  name: string;
  count: number;
  perc: number;
  rangeDesc: string;
}

export interface CyberKpis {
  totalLidos: number;
  zerosCount: number;
  parImpar: BaseKpiMetric;
  cor: BaseKpiMetric;
  maiorMenor: BaseKpiMetric;
  duzias: [GroupKpiItem, GroupKpiItem, GroupKpiItem];
  colunas: [GroupKpiItem, GroupKpiItem, GroupKpiItem];
}

/**
 * Calcula os 10 números prováveis baseados no último número lido.
 * Utiliza o alinhamento físico do rotor europeu (5 vizinhos à esquerda e 5 à direita).
 */
export function calcular10AlvosProvaveis(ultimoNumero: number | null | undefined): number[] {
  if (ultimoNumero === null || ultimoNumero === undefined) {
    // Alvos balísticos padrão caso ainda não haja giros
    return [32, 15, 19, 4, 21, 26, 3, 35, 12, 28];
  }

  const idx = CYBER_CILINDRO.indexOf(ultimoNumero);
  if (idx === -1) {
    return [32, 15, 19, 4, 21, 26, 3, 35, 12, 28];
  }

  const n = CYBER_CILINDRO.length; // 37
  const alvos: number[] = [];

  // Pega os 5 vizinhos anteriores e os 5 vizinhos posteriores no rotor
  for (let offset = -5; offset <= 5; offset++) {
    if (offset === 0) continue; // Pula o próprio número
    const targetIdx = (idx + offset + n) % n;
    alvos.push(CYBER_CILINDRO[targetIdx]!);
  }

  return alvos;
}

/**
 * Calcula todas as estatísticas e KPIs em tempo real dos últimos 40 números lidos.
 * REGRA OBRIGATÓRIA: O número 0 é contabilizado no Total de Lidos,
 * mas é estritamente ignorado no denominador de cálculos de porcentagem de Par/Ímpar,
 * Cor, Maior/Menor, Dúzias e Colunas.
 */
export function calcularCyberKpis(numeros: number[]): CyberKpis {
  // Limita estritamente aos últimos 40 números
  const window40 = numeros.slice(0, 40);
  const totalLidos = window40.length;

  const nonZeros = window40.filter((n) => n !== 0);
  const totalNonZeros = nonZeros.length;
  const zerosCount = totalLidos - totalNonZeros;

  const calcPerc = (count: number): number => {
    if (totalNonZeros === 0) return 0;
    return (count / totalNonZeros) * 100;
  };

  // 1. Par / Ímpar
  const paresCount = nonZeros.filter((n) => n % 2 === 0).length;
  const imparesCount = totalNonZeros - paresCount;

  // 2. Vermelho / Preto
  const redCount = nonZeros.filter((n) => CYBER_REDS.includes(n)).length;
  const blackCount = totalNonZeros - redCount;

  // 3. Maior (19-36) / Menor (1-18)
  const menorCount = nonZeros.filter((n) => n >= 1 && n <= 18).length;
  const maiorCount = nonZeros.filter((n) => n >= 19 && n <= 36).length;

  // 4. Três Dúzias
  const dz1Count = nonZeros.filter((n) => n >= 1 && n <= 12).length;
  const dz2Count = nonZeros.filter((n) => n >= 13 && n <= 24).length;
  const dz3Count = nonZeros.filter((n) => n >= 25 && n <= 36).length;

  // 5. Três Colunas
  const col1Count = nonZeros.filter((n) => n % 3 === 1).length;
  const col2Count = nonZeros.filter((n) => n % 3 === 2).length;
  const col3Count = nonZeros.filter((n) => n % 3 === 0).length;

  return {
    totalLidos,
    zerosCount,
    parImpar: {
      labelA: "PAR",
      countA: paresCount,
      percA: calcPerc(paresCount),
      labelB: "ÍMPAR",
      countB: imparesCount,
      percB: calcPerc(imparesCount),
    },
    cor: {
      labelA: "VERMELHO",
      countA: redCount,
      percA: calcPerc(redCount),
      labelB: "PRETO",
      countB: blackCount,
      percB: calcPerc(blackCount),
    },
    maiorMenor: {
      labelA: "MENOR (1-18)",
      countA: menorCount,
      percA: calcPerc(menorCount),
      labelB: "MAIOR (19-36)",
      countB: maiorCount,
      percB: calcPerc(maiorCount),
    },
    duzias: [
      { name: "1ª DÚZIA", count: dz1Count, perc: calcPerc(dz1Count), rangeDesc: "1 ao 12" },
      { name: "2ª DÚZIA", count: dz2Count, perc: calcPerc(dz2Count), rangeDesc: "13 ao 24" },
      { name: "3ª DÚZIA", count: dz3Count, perc: calcPerc(dz3Count), rangeDesc: "25 ao 36" },
    ],
    colunas: [
      { name: "1ª COLUNA", count: col1Count, perc: calcPerc(col1Count), rangeDesc: "1, 4, 7... 34" },
      { name: "2ª COLUNA", count: col2Count, perc: calcPerc(col2Count), rangeDesc: "2, 5, 8... 35" },
      { name: "3ª COLUNA", count: col3Count, perc: calcPerc(col3Count), rangeDesc: "3, 6, 9... 36" },
    ],
  };
}

/**
 * Retorna a contagem de frequência de repetição dos números 0 a 36.
 */
export function calcularFrequenciaNumeros(numeros: number[]): number[] {
  const window40 = numeros.slice(0, 40);
  const freq = new Array(37).fill(0);
  for (const n of window40) {
    if (n >= 0 && n <= 36) {
      freq[n]++;
    }
  }
  return freq;
}

/**
 * Determina a cor roleta de um número
 */
export function getCorNumeroCyber(n: number): "green" | "red" | "black" {
  if (n === 0) return "green";
  return CYBER_REDS.includes(n) ? "red" : "black";
}
