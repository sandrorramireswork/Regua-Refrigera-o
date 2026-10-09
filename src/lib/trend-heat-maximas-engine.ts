import { CILINDRO, type Spin } from "@/lib/roulette";

export interface InfoNumeroCalor {
  numero: number;
  temperatura: number; // 0 a 100°C
  frequenciaRecente: number;
  atraso: number; // giros desde última ocorrência
  maturacao: number; // 0 a 100% de probabilidade cumulativa (1 - (36/37)^k)
  statusCalor: "supernova" | "quente" | "morno" | "frio";
}

export interface AnaliseTendenciaCalorMaximas {
  id: string;
  nome: string;
  numeros: number[];
  // Valor de Tendência Composto (0 a 100)
  valorTendencia: number;
  isMomentoBom: boolean;
  statusLabel: string;
  nivelForca: "extrema" | "alta" | "moderada" | "neutra";
  // Pesquisa Avançada de Calor dos Números que compõem o grupo
  numerosQuentes: InfoNumeroCalor[];
  numerosAtrasados: InfoNumeroCalor[];
  alvosSniper: number[]; // Interseção cirúrgica de números quentes + maturação
  temperaturaMediaGrupo: number;
  // Pesquisa Avançada de Máximas do Grupo
  atrasoAtualGrupo: number;
  maximaAtrasoPeriodo: number;
  maturacaoGrupo: number; // % (1 - (1-p)^k)
  cicloMedioAtraso: number;
  ganhoRecente: number;
  semQuedaRecente: boolean;
  velocidadeSlope: number; // pts por giro recente
  justificativaCientifica: string;
  movimentoExato: string;
}

/**
 * Mapeamento de índices no cilindro para cálculo de propagação térmica
 */
const CILINDRO_MAP = new Map<number, number>(
  CILINDRO.map((num, idx) => [num, idx])
);

/**
 * Calcula a temperatura e atraso de cada um dos 37 números da roleta
 * com base na janela cronológica mais recente (ordem cronológica).
 */
export function calcularMapaCalorNumeros(
  numerosCronologicos: number[],
  tamanhoJanela: number = 30
): Map<number, InfoNumeroCalor> {
  const mapa = new Map<number, InfoNumeroCalor>();
  const totalGiros = numerosCronologicos.length;
  const janela = numerosCronologicos.slice(-tamanhoJanela);
  const n = janela.length || 1;

  // 1. Contagem de frequência e cálculo do último índice de saída
  const frequencias = new Map<number, number>();
  const ultimoIndice = new Map<number, number>();

  for (let i = 0; i <= 36; i++) {
    frequencias.set(i, 0);
    ultimoIndice.set(i, -1);
  }

  janela.forEach((num, idx) => {
    frequencias.set(num, (frequencias.get(num) ?? 0) + 1);
    ultimoIndice.set(num, idx);
  });

  // 2. Cálculo do calor térmico individual com decaimento exponencial
  for (let num = 0; num <= 36; num++) {
    const freq = frequencias.get(num) ?? 0;
    const ultIdx = ultimoIndice.get(num) ?? -1;
    const atraso = ultIdx === -1 ? n : n - 1 - ultIdx;

    // Maturação para número pleno (p = 1/37)
    const pPleno = 1 / 37;
    const maturacao = Number(((1 - Math.pow(1 - pPleno, atraso)) * 100).toFixed(1));

    // Cálculo do calor com peso de recência
    let pontosCalor = 0;
    janela.forEach((sorteado, idx) => {
      if (sorteado === num) {
        // Mais recente vale mais
        const pesoTemporal = Math.pow(1.06, idx) / Math.pow(1.06, n - 1);
        pontosCalor += 28 * pesoTemporal;
      }
    });

    // Se saiu muito recentemente, ganha bônus de inércia
    if (atraso === 0) pontosCalor += 15;
    else if (atraso <= 2) pontosCalor += 8;

    const temperatura = Math.min(100, Math.round(pontosCalor));

    let statusCalor: InfoNumeroCalor["statusCalor"] = "frio";
    if (temperatura >= 70) statusCalor = "supernova";
    else if (temperatura >= 45) statusCalor = "quente";
    else if (temperatura >= 20) statusCalor = "morno";

    mapa.set(num, {
      numero: num,
      temperatura,
      frequenciaRecente: freq,
      atraso,
      maturacao,
      statusCalor,
    });
  }

  return mapa;
}

/**
 * Avalia de forma cirúrgica e rigorosa se uma tendência está em MOMENTO BOM
 * substituindo a regra mecânica de 5 giros por um VALOR DE TENDÊNCIA CONSISTENTE
 * somado à PESQUISA DE MÁXIMAS e CALOR DE CADA NÚMERO.
 */
export function avaliarTendenciaCirurgica({
  id,
  nome,
  numeros,
  pontosHistorico,
  todosNumerosCronologicos,
  probabilidadeTeorica = numeros.length / 37,
  limiarCorteTendencia = 70,
}: {
  id: string;
  nome: string;
  numeros: number[];
  pontosHistorico: number[];
  todosNumerosCronologicos: number[];
  probabilidadeTeorica?: number;
  limiarCorteTendencia?: number;
}): AnaliseTendenciaCalorMaximas {
  const mapaCalor = calcularMapaCalorNumeros(todosNumerosCronologicos, 30);
  const numerosSet = new Set(numeros);

  // 1. Pesquisa Avançada de Calor dos números específicos deste grupo
  const infosGrupo: InfoNumeroCalor[] = numeros.map((num) => {
    return (
      mapaCalor.get(num) ?? {
        numero: num,
        temperatura: 0,
        frequenciaRecente: 0,
        atraso: 30,
        maturacao: 55,
        statusCalor: "frio",
      }
    );
  });

  // Números quentes ordenados por temperatura decrescente
  const numerosQuentes = infosGrupo
    .filter((n) => n.temperatura >= 35 || n.frequenciaRecente >= 2)
    .sort((a, b) => b.temperatura - a.temperatura);

  // Números atrasados ordenados por maturação
  const numerosAtrasados = infosGrupo
    .filter((n) => n.atraso >= 8)
    .sort((a, b) => b.maturacao - a.maturacao);

  // Alvos Sniper: combinação dos números mais quentes com os de maior maturação
  const alvosSniperSet = new Set<number>();
  numerosQuentes.slice(0, 4).forEach((n) => alvosSniperSet.add(n.numero));
  numerosAtrasados.slice(0, 2).forEach((n) => alvosSniperSet.add(n.numero));
  if (alvosSniperSet.size === 0) {
    numeros.slice(0, 4).forEach((n) => alvosSniperSet.add(n));
  }
  const alvosSniper = Array.from(alvosSniperSet);

  const somaTemp = infosGrupo.reduce((acc, curr) => acc + curr.temperatura, 0);
  const temperaturaMediaGrupo = Math.round(somaTemp / (infosGrupo.length || 1));

  // 2. Pesquisa Avançada de Máximas e Atraso do Grupo
  let atrasoAtualGrupo = 0;
  let maxAtraso = 0;
  let atrasoTemp = 0;
  const atrasosHistoricos: number[] = [];

  const invertidos = [...todosNumerosCronologicos].reverse();
  const primeiroMatch = invertidos.findIndex((n) => numerosSet.has(n));
  atrasoAtualGrupo = primeiroMatch === -1 ? todosNumerosCronologicos.length : primeiroMatch;

  todosNumerosCronologicos.forEach((num) => {
    if (numerosSet.has(num)) {
      atrasosHistoricos.push(atrasoTemp);
      if (atrasoTemp > maxAtraso) maxAtraso = atrasoTemp;
      atrasoTemp = 0;
    } else {
      atrasoTemp++;
    }
  });
  if (atrasoTemp > maxAtraso) maxAtraso = atrasoTemp;

  const somaAtrasos = atrasosHistoricos.reduce((a, b) => a + b, 0);
  const cicloMedioAtraso =
    atrasosHistoricos.length > 0 ? Number((somaAtrasos / atrasosHistoricos.length).toFixed(1)) : 2.5;

  const pGrupo = probabilidadeTeorica;
  const maturacaoGrupo = Number(
    ((1 - Math.pow(1 - pGrupo, atrasoAtualGrupo)) * 100).toFixed(1)
  );

  // 3. Análise da Curva de Pontos (Tolerância 2x)
  let ganhoRecente = 0;
  let semQuedaRecente = false;
  let velocidadeSlope = 0;

  const janelaMinima = Math.min(6, pontosHistorico.length);
  if (janelaMinima >= 3) {
    const janela = pontosHistorico.slice(-janelaMinima);
    const pUlt = janela[janela.length - 1] ?? 0;
    const pPrim = janela[0] ?? 0;
    ganhoRecente = pUlt - pPrim;

    let semQueda = true;
    for (let i = 1; i < janela.length; i++) {
      const atual = janela[i];
      const ant = janela[i - 1];
      if (atual === undefined || ant === undefined || atual < ant) {
        semQueda = false;
        break;
      }
    }
    semQuedaRecente = semQueda;
    velocidadeSlope = Number((ganhoRecente / (janelaMinima - 1)).toFixed(2));
  }

  // 4. CÁLCULO CIRÚRGICO DO VALOR DE TENDÊNCIA (0 a 100)
  // Pesagem:
  // A. Inclinação e Ganho na Tolerância (40% do score)
  let ptsGanho = 0;
  if (ganhoRecente >= 4 && semQuedaRecente) ptsGanho = 40;
  else if (ganhoRecente >= 3 && semQuedaRecente) ptsGanho = 35;
  else if (ganhoRecente >= 2 && semQuedaRecente) ptsGanho = 28;
  else if (ganhoRecente >= 2) ptsGanho = 20;
  else if (ganhoRecente >= 1) ptsGanho = 12;

  // B. Calor dos Números da Tendência (35% do score)
  let ptsCalor = 0;
  if (temperaturaMediaGrupo >= 45) ptsCalor = 35;
  else if (temperaturaMediaGrupo >= 30) ptsCalor = 28;
  else if (temperaturaMediaGrupo >= 20) ptsCalor = 20;
  else if (numerosQuentes.length >= 2) ptsCalor = 18;
  else if (numerosQuentes.length >= 1) ptsCalor = 10;

  // C. Posição de Ciclo & Máximas (25% do score)
  // Se o atraso do grupo está quente (saiu no giro atual ou anterior, inércia ativa)
  let ptsMaximas = 0;
  if (atrasoAtualGrupo === 0) ptsMaximas = 25;
  else if (atrasoAtualGrupo === 1) ptsMaximas = 20;
  else if (atrasoAtualGrupo <= 2) ptsMaximas = 15;
  else if (maturacaoGrupo >= 85) ptsMaximas = 18; // Ponto de maturação de atraso estocástico

  let valorTendencia = Math.min(100, Math.round(ptsGanho + ptsCalor + ptsMaximas));

  // O Gatilho Cirúrgico exige que a tendência tenha:
  // - Pontuação positiva recente
  // - Presença de calor nos números que estão pontuando
  // - Score >= limiar (70%)
  const isMomentoBom = valorTendencia >= limiarCorteTendencia && ganhoRecente >= 2 && semQuedaRecente;

  let nivelForca: AnaliseTendenciaCalorMaximas["nivelForca"] = "neutra";
  let statusLabel = "⏳ AGUARDANDO MOMENTO BOM (MERCADO EM TRANSIÇÃO)";

  if (valorTendencia >= 85 && isMomentoBom) {
    nivelForca = "extrema";
    statusLabel = "⚡ TENDÊNCIA SUPERNOVA · ALTA CONSISTÊNCIA CIRÚRGICA";
  } else if (isMomentoBom) {
    nivelForca = "alta";
    statusLabel = "🔥 MOMENTO BOM · TENDÊNCIA DE ALTA VALIDADA";
  } else if (valorTendencia >= 50) {
    nivelForca = "moderada";
    statusLabel = "📈 EM AQUECIMENTO · APROXIMANDO-SE DO GATILHO";
  }

  const nomesQuentesStr =
    numerosQuentes.length > 0
      ? numerosQuentes.map((n) => `${n.numero} (${n.temperatura}°C)`).join(", ")
      : "Nenhum em pico";

  const justificativaCientifica = isMomentoBom
    ? `${nome} com Força de Tendência em ${valorTendencia}% (+${ganhoRecente} pts sem quedas). Calor médio de ${temperaturaMediaGrupo}°C com ignição nos números: [ ${nomesQuentesStr} ]. Atraso atual de ${atrasoAtualGrupo} giros dentro do ciclo médio.`
    : `${nome} em avaliação estocástica (Score: ${valorTendencia}%). Aguardando alinhamento de ganho e calor de números para entrada consistente.`;

  const movimentoExato = isMomentoBom
    ? `APOSTA NA ${nome.toUpperCase()} COM COBERTURA NO 0 · ALVOS SNIPER DE CALOR & MÁXIMAS: [ ${alvosSniper.join(", ")} ] · JANELA CIRÚRGICA: PRÓXIMOS 3 GIROS!`
    : `PROTEGER BANCA · AGUARDAR FORÇA DE TENDÊNCIA ATINGIR 70% COM IGNIÇÃO TÉRMICA COMPROVADA.`;

  return {
    id,
    nome,
    numeros,
    valorTendencia,
    isMomentoBom,
    statusLabel,
    nivelForca,
    numerosQuentes,
    numerosAtrasados,
    alvosSniper,
    temperaturaMediaGrupo,
    atrasoAtualGrupo,
    maximaAtrasoPeriodo: maxAtraso,
    maturacaoGrupo,
    cicloMedioAtraso,
    ganhoRecente,
    semQuedaRecente,
    velocidadeSlope,
    justificativaCientifica,
    movimentoExato,
  };
}
