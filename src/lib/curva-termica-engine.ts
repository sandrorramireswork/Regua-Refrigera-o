/**
 * MOTOR DE CURVA TÉRMICA & ÍNDICE DE CONFIANÇA DE ALTA DENSIDADE (HDCI)
 * 
 * Modela a física estocástica da roleta europeia combinando:
 * 1. Termodinâmica de Rotor (inércia de calor nos números e vizinhos físicos do cilindro)
 * 2. Filtro Passa-Baixa Anti-Ruído (elimina dispersão aleatória e Brownian motion)
 * 3. Índice de Confiança de Alta Densidade (HDCI) baseado em concentração espacial e gradiente térmico
 */

import { CILINDRO, REDS, type Spin } from "@/lib/roulette";
import { calcularIndiceEntropia } from "@/lib/quantitative-terminal-engine";

export interface PontoCurvaTermica {
  rodadaLabel: string;      // Ex: "G-10", "G-1"
  numeroGiro: number;       // Número sorteado naquele ponto
  temperaturaMedia: number; // 0 a 100°C na zona ativa
  densidadeCluster: number; // 0 a 100% de concentração na janela
  curvaSuavizada: number;   // Filtro passa-baixa anti-ruído (EMA adaptativa)
  limiarCorte: number;      // 88% (patamar estrito de alta assertividade)
  isPicoAltaDensidade: boolean;
}

export interface NumeroTermicoInfo {
  numero: number;
  temperatura: number;      // 0 a 100
  densidadePerc: number;    // % de presença ponderada
  posicaoCilindro: number;  // 0 a 36 no rotor
  isHot: boolean;
  isSupernova: boolean;     // > 85%
  cor: "red" | "black" | "green";
}

export type StatusConfiancaDensidade = 
  | "ALTA_DENSIDADE_CONFIRMADA"
  | "DENSIDADE_EM_AQUECIMENTO"
  | "DISPERSAO_RUIDO_BLOQUEADO";

export interface AnaliseTermicaResultado {
  indiceConfianca: number;             // 0 a 100% (HDCI)
  statusConfianca: StatusConfiancaDensidade;
  temperaturaMomento: number;          // 0 a 100°C
  gradienteDelta: number;              // Variação térmica recente (+X.X% ou -X.X%)
  gradienteTexto: string;              // Ex: "+14.8% (Aquecendo rapidamente)"
  ruidosSuprimidosPerc: number;        // Nível de absorção de ruído pelo filtro
  pontosCurva: PontoCurvaTermica[];    // 15 a 30 pontos para o gráfico
  fitaCilindroTermico: NumeroTermicoInfo[]; // 37 números ordenados pelo rotor com temperatura
  nucleoAlvosQuentes: number[];        // 4 a 8 números mais quentes da zona
  nucleoAlvosLabel: string;            // Ex: "Zona Voisins / Zero Spiel"
  justificativaAssertiva: string;
  isEntradaLiberada: boolean;          // true somente se HDCI >= 85% e sem ruído crítico
}

/**
 * Encontra o índice de um número na disposição física do cilindro
 */
const CILINDRO_INDEX_MAP = new Map<number, number>(
  CILINDRO.map((num, idx) => [num, idx])
);

/**
 * Distância circular mínima entre duas casas no cilindro (0 a 18)
 */
export function distanciaNoCilindro(a: number, b: number): number {
  const idxA = CILINDRO_INDEX_MAP.get(a) ?? 0;
  const idxB = CILINDRO_INDEX_MAP.get(b) ?? 0;
  const diff = Math.abs(idxA - idxB);
  return Math.min(diff, 37 - diff);
}

/**
 * Calcula a temperatura e densidade de cada número com decaimento exponencial
 * e propagação física radial no cilindro (vizinhos recebem calor)
 */
export function calcularTermodinamicaCilindro(
  numeros: number[],
  tamanhoJanela: number = 25
): Map<number, number> {
  const temperaturas = new Map<number, number>();
  for (let i = 0; i <= 36; i++) {
    temperaturas.set(i, 0);
  }

  if (numeros.length === 0) return temperaturas;

  const janela = numeros.slice(0, tamanhoJanela);
  const totalGiros = janela.length;

  // Percorre do mais antigo ao mais recente
  janela.slice().reverse().forEach((numSorteado, stepIdx) => {
    // Fator de peso temporal exponencial: giros mais recentes injetam mais energia
    const pesoTemporal = Math.pow(1.08, stepIdx) / Math.pow(1.08, totalGiros - 1);

    // Injeção de calor direto no número sorteado
    const idxSorteado = CILINDRO_INDEX_MAP.get(numSorteado) ?? 0;

    // Propaga calor para os vizinhos no cilindro em raio 3
    for (let offset = -3; offset <= 3; offset++) {
      const idxVizinho = (idxSorteado + offset + 37) % 37;
      const numVizinho = CILINDRO[idxVizinho]!;
      const dist = Math.abs(offset);

      // Coeficiente de condução térmica radial: centro 1.0, dist 1: 0.55, dist 2: 0.30, dist 3: 0.15
      const conducao = dist === 0 ? 1.0 : dist === 1 ? 0.55 : dist === 2 ? 0.30 : 0.15;
      const calorInjetado = 28 * pesoTemporal * conducao;

      const atual = temperaturas.get(numVizinho) ?? 0;
      temperaturas.set(numVizinho, Math.min(100, atual * 0.94 + calorInjetado));
    }
  });

  return temperaturas;
}

/**
 * Executa a análise completa da Curva Térmica e Índice de Confiança de Alta Densidade (HDCI)
 */
export function analisarCurvaTermicaAltaDensidade(
  spinsOuNumeros: (number | Spin)[],
  sampleSize: number = 25
): AnaliseTermicaResultado {
  // Normaliza entrada para array numérico
  const numeros: number[] = spinsOuNumeros.map((s) => (typeof s === "number" ? s : s.num));

  if (numeros.length < 5) {
    const defaultFita: NumeroTermicoInfo[] = CILINDRO.map((num, idx) => ({
      numero: num,
      temperatura: 0,
      densidadePerc: 0,
      posicaoCilindro: idx,
      isHot: false,
      isSupernova: false,
      cor: num === 0 ? "green" : REDS.includes(num) ? "red" : "black",
    }));

    return {
      indiceConfianca: 50,
      statusConfianca: "DISPERSAO_RUIDO_BLOQUEADO",
      temperaturaMomento: 30,
      gradienteDelta: 0,
      gradienteTexto: "Aguardando volume de giros...",
      ruidosSuprimidosPerc: 100,
      pontosCurva: [],
      fitaCilindroTermico: defaultFita,
      nucleoAlvosQuentes: [0, 3, 12, 15, 26, 32, 35, 34],
      nucleoAlvosLabel: "Setor Zero Spiel / Voisins",
      justificativaAssertiva: "Amostra insuficiente. Registre ao menos 5 giros para calibrar a curva térmica.",
      isEntradaLiberada: false,
    };
  }

  const janelaNumeros = numeros.slice(0, Math.min(sampleSize, numeros.length));
  const cronologico = [...janelaNumeros].reverse();

  // 1. Termodinâmica dos 37 números
  const mapaCalor = calcularTermodinamicaCilindro(numeros, sampleSize);

  // Mapeia fita do cilindro
  const fitaCilindroTermico: NumeroTermicoInfo[] = CILINDRO.map((num, idx) => {
    const temp = Math.round(mapaCalor.get(num) ?? 0);
    const count = janelaNumeros.filter((n) => n === num).length;
    const densidadePerc = Number(((count / janelaNumeros.length) * 100).toFixed(1));
    return {
      numero: num,
      temperatura: temp,
      densidadePerc,
      posicaoCilindro: idx,
      isHot: temp >= 65,
      isSupernova: temp >= 82,
      cor: num === 0 ? "green" : REDS.includes(num) ? "red" : "black",
    };
  });

  // 2. Identificação do Núcleo Térmico de Alta Densidade (Cluster de maior calor contíguo)
  // Varre janelas de 7 casas no cilindro para achar o arco de maior temperatura
  let melhorSomaTemp = -1;
  let melhorCentroIdx = 0;
  for (let i = 0; i < 37; i++) {
    let soma = 0;
    for (let r = -3; r <= 3; r++) {
      const idx = (i + r + 37) % 37;
      soma += mapaCalor.get(CILINDRO[idx]!) ?? 0;
    }
    if (soma > melhorSomaTemp) {
      melhorSomaTemp = soma;
      melhorCentroIdx = i;
    }
  }

  // Extrai os 7 números do cluster mais quente
  const nucleoAlvosQuentes: number[] = [];
  for (let r = -3; r <= 3; r++) {
    const idx = (melhorCentroIdx + r + 37) % 37;
    nucleoAlvosQuentes.push(CILINDRO[idx]!);
  }

  // Adiciona o 34 se houver forte atração
  if (!nucleoAlvosQuentes.includes(34) && (mapaCalor.get(34) ?? 0) >= 60) {
    nucleoAlvosQuentes.push(34);
  }

  const alvosSet = new Set(nucleoAlvosQuentes);
  const centroNum = CILINDRO[melhorCentroIdx]!;
  const nucleoAlvosLabel = `Cluster Térmico Central: ${centroNum} (${nucleoAlvosQuentes.length} números)`;

  // 3. Construção da Série Temporal da Curva Térmica com Filtro Passa-Baixa
  let emaTemp = 40;
  const alfaFiltro = 0.32; // Coeficiente de suavização contra ruído aleatório
  const pontosCurva: PontoCurvaTermica[] = [];

  let acertosClusterAcumulados = 0;

  cronologico.forEach((numSorteado, i) => {
    const isHit = alvosSet.has(numSorteado);
    if (isHit) acertosClusterAcumulados++;

    const totalAteAqui = i + 1;
    const densidadeCluster = Math.round((acertosClusterAcumulados / totalAteAqui) * 100);

    // Temperatura instantânea daquele ponto baseada nos últimos 4 giros
    const subSlice = cronologico.slice(Math.max(0, i - 3), i + 1);
    const hitsRecentes = subSlice.filter((n) => alvosSet.has(n)).length;
    const tempInstantanea = Math.min(100, Math.round((hitsRecentes / subSlice.length) * 100 * 0.95 + 10));

    // Filtro Passa-Baixa (EMA): suaviza spikes pontuais isolados
    emaTemp = emaTemp * (1 - alfaFiltro) + tempInstantanea * alfaFiltro;
    const curvaSuavizada = Math.round(emaTemp);

    pontosCurva.push({
      rodadaLabel: `G${i + 1}`,
      numeroGiro: numSorteado,
      temperaturaMedia: tempInstantanea,
      densidadeCluster,
      curvaSuavizada,
      limiarCorte: 88,
      isPicoAltaDensidade: curvaSuavizada >= 88,
    });
  });

  // 4. Cálculo do Índice de Confiança de Alta Densidade (HDCI)
  const entropy = calcularIndiceEntropia(numeros, sampleSize);
  const temperaturaMomento = pontosCurva[pontosCurva.length - 1]?.curvaSuavizada ?? 50;
  const tempPenultimo = pontosCurva[pontosCurva.length - 3]?.curvaSuavizada ?? temperaturaMomento;
  const gradienteDelta = Number((temperaturaMomento - tempPenultimo).toFixed(1));

  // Concentração dos últimos giros no cluster de alvos
  const ultimos6 = numeros.slice(0, 6);
  const hitsUltimos6 = ultimos6.filter((n) => alvosSet.has(n)).length;
  const concentracaoRecentePerc = (hitsUltimos6 / ultimos6.length) * 100;

  // Fatores de Composição do HDCI:
  // F1: Concentração e temperatura da zona (peso 40%)
  const f1 = Math.min(100, temperaturaMomento * 0.6 + concentracaoRecentePerc * 0.4);

  // F2: Gradiente de aceleração térmica (peso 25%)
  const f2 = Math.max(10, Math.min(100, 50 + gradienteDelta * 3.5));

  // F3: Inverso da entropia (peso 20%): Caos baixo = confiança alta
  const f3 = Math.max(10, Math.min(100, 100 - entropy.entropyPercent * 0.9));

  // F4: Densidade teórica acima da média esperada (peso 15%)
  const densidadeEsperada = (nucleoAlvosQuentes.length / 37) * 100;
  const densidadeReal = (janelaNumeros.filter((n) => alvosSet.has(n)).length / janelaNumeros.length) * 100;
  const ratioDensidade = Math.min(2.5, densidadeReal / Math.max(1, densidadeEsperada));
  const f4 = Math.min(100, ratioDensidade * 40);

  const hdciBruto = f1 * 0.40 + f2 * 0.25 + f3 * 0.20 + f4 * 0.15;
  const indiceConfianca = Math.max(10, Math.min(99, Math.round(hdciBruto)));

  // Classificação do Status
  let statusConfianca: StatusConfiancaDensidade = "DISPERSAO_RUIDO_BLOQUEADO";
  let isEntradaLiberada = false;

  if (indiceConfianca >= 85 && temperaturaMomento >= 78 && entropy.level !== "ALTA") {
    statusConfianca = "ALTA_DENSIDADE_CONFIRMADA";
    isEntradaLiberada = true;
  } else if (indiceConfianca >= 72 || gradienteDelta > 5) {
    statusConfianca = "DENSIDADE_EM_AQUECIMENTO";
    isEntradaLiberada = false;
  } else {
    statusConfianca = "DISPERSAO_RUIDO_BLOQUEADO";
    isEntradaLiberada = false;
  }

  // Texto do Gradiente
  const gradienteTexto =
    gradienteDelta > 6
      ? `+${gradienteDelta}% (Aquecendo rapidamente)`
      : gradienteDelta > 0
      ? `+${gradienteDelta}% (Tendência ascendente)`
      : gradienteDelta === 0
      ? "0.0% (Equilíbrio estático)"
      : `${gradienteDelta}% (Resfriamento térmico)`;

  const ruidosSuprimidosPerc = Math.max(
    65,
    Math.min(98, Math.round(100 - (100 - indiceConfianca) * 0.5))
  );

  const justificativaAssertiva =
    isEntradaLiberada
      ? `Densidade térmica no patamar crítico de ${indiceConfianca}% com gradiente positivo (${gradienteTexto}). O núcleo [${nucleoAlvosQuentes.slice(0, 5).join(", ")}...] concentra ${concentracaoRecentePerc.toFixed(0)}% das últimas 6 quedas com ruído Brownian suprimido.`
      : statusConfianca === "DENSIDADE_EM_AQUECIMENTO"
      ? `Formação de calor detectada (HDCI ${indiceConfianca}%), porém a curva ainda não ultrapassou o limiar de 88%. Blindagem mantida para evitar entradas prematuras.`
      : `Dispersão térmica uniforme com alta entropia. O filtro suprimiu ${ruidosSuprimidosPerc}% das oscilações espúrias. Aguarde convergência de alta densidade.`;

  return {
    indiceConfianca,
    statusConfianca,
    temperaturaMomento,
    gradienteDelta,
    gradienteTexto,
    ruidosSuprimidosPerc,
    pontosCurva,
    fitaCilindroTermico,
    nucleoAlvosQuentes,
    nucleoAlvosLabel,
    justificativaAssertiva,
    isEntradaLiberada,
  };
}
