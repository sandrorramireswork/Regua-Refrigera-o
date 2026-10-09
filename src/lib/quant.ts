import { CILINDRO, getProps, type Spin } from "@/lib/roulette";

/* ─────────────────────────── Colunas camufladas 147 / 258 / 369 ────────────────────────── */

export const GRUPOS_COLUNA = [
  { id: "147", label: "147", numbers: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34] },
  { id: "258", label: "258", numbers: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35] },
  { id: "369", label: "369", numbers: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36] },
] as const;

export interface GrupoCiclo {
  id: string;
  label: string;
  /** últimas 3 ocorrências (números, do mais recente para o mais antigo) */
  ultimas: number[];
  /** giros desde a última aparição (null = nunca apareceu) */
  atraso: number | null;
  qtd: number;
  perc: number;
  /** probabilidade acumulada de já ter saído no atraso atual (1 - (24/37)^atraso) */
  probAtraso: number;
}

export function calcCiclosColuna(h: Spin[]): GrupoCiclo[] {
  const total = h.filter((s) => s.num !== 0).length || 1;
  return GRUPOS_COLUNA.map((g) => {
    const set = new Set<number>(g.numbers);
    const ultimas: number[] = [];
    let atraso: number | null = null;
    h.forEach((s, i) => {
      if (!set.has(s.num)) return;
      if (atraso === null) atraso = i;
      if (ultimas.length < 3) ultimas.push(s.num);
    });
    const qtd = h.filter((s) => set.has(s.num)).length;
    const a = atraso ?? h.length;
    return {
      id: g.id,
      label: g.label,
      ultimas,
      atraso,
      qtd,
      perc: (qtd / total) * 100,
      probAtraso: 1 - Math.pow(25 / 37, a),
    };
  });
}

/* ─────────────────────────── Rotor físico e distância angular ────────────────────────── */

export function indiceRotor(n: number) {
  return CILINDRO.indexOf(n);
}

/** menor distância em casas (0..18) entre dois números no cilindro */
export function distanciaAngular(a: number, b: number): number {
  const ia = indiceRotor(a);
  const ib = indiceRotor(b);
  if (ia < 0 || ib < 0) return 0;
  const d = Math.abs(ia - ib);
  return Math.min(d, CILINDRO.length - d);
}

/** deslocamento médio dos últimos giros */
export function deslocamentoRecente(h: Spin[], janela = 10): number {
  const alvo = h.slice(0, janela + 1);
  if (alvo.length < 2) return 0;
  let soma = 0;
  for (let i = 0; i < alvo.length - 1; i += 1) {
    soma += distanciaAngular(alvo[i]!.num, alvo[i + 1]!.num);
  }
  return soma / (alvo.length - 1);
}

/* ─────────────────────────── Z-Score e Kelly ────────────────────────── */

/** probabilidade nula de uma zona de 5 casas */
export const P_ZONA = 5 / 37;

export function zScore(percObservado: number, n: number, p = P_ZONA): number {
  if (n <= 0) return 0;
  const obs = percObservado / 100;
  return (obs - p) / Math.sqrt((p * (1 - p)) / n);
}

/** Kelly exato: f = (bp - q) / b. Defaults definidos para retorno líquido b=36. */
export function kellyFracionado(p: number, b = 36, fracao = 1): number {
  const q = 1 - p;
  const f = (b * p - q) / b;
  return f * fracao;
}

/* ─────────────────────────── Motores dos padrões 1 a 4 ────────────────────────── */

export interface MotorInercia {
  /** repetição do mesmo número imediatamente */
  repeticoes: number;
  /** sequência atual de giros na mesma dúzia */
  runDuzia: number;
  /** sequência atual de giros na mesma coluna */
  runColuna: number;
  /** giros dentro de 2 casas do anterior no rotor */
  proximidade: number;
  percProximidade: number;
}

export function motorInercia(h: Spin[]): MotorInercia {
  let repeticoes = 0;
  let proximidade = 0;
  for (let i = 0; i < h.length - 1; i += 1) {
    if (h[i]!.num === h[i + 1]!.num) repeticoes += 1;
    if (distanciaAngular(h[i]!.num, h[i + 1]!.num) <= 2) proximidade += 1;
  }
  const run = (pick: (s: Spin) => number) => {
    if (h.length === 0 || pick(h[0]!) === 0) return 0;
    let c = 1;
    while (c < h.length && pick(h[c]!) === pick(h[0]!)) c += 1;
    return c;
  };
  const pares = Math.max(1, h.length - 1);
  return {
    repeticoes,
    runDuzia: run((s) => s.props.duzia),
    runColuna: run((s) => s.props.coluna),
    proximidade,
    percProximidade: (proximidade / pares) * 100,
  };
}

export interface MotorMaiorMenor {
  maior: number;
  menor: number;
  percMaior: number;
  desvio: number;
  runAtual: number;
  ladoAtual: "MAIOR" | "MENOR" | "ZERO";
  sinalReversao: boolean;
}

export function motorMaiorMenor(h: Spin[]): MotorMaiorMenor {
  const val = h.filter((s) => s.num !== 0);
  const maior = val.filter((s) => s.num >= 19).length;
  const menor = val.length - maior;
  const total = val.length || 1;
  const percMaior = (maior / total) * 100;
  const ladoAtual: MotorMaiorMenor["ladoAtual"] =
    h[0] === undefined ? "ZERO" : h[0].num === 0 ? "ZERO" : h[0].num >= 19 ? "MAIOR" : "MENOR";
  let runAtual = 0;
  if (ladoAtual !== "ZERO") {
    for (const s of h) {
      if (s.num === 0) break;
      const lado = s.num >= 19 ? "MAIOR" : "MENOR";
      if (lado !== ladoAtual) break;
      runAtual += 1;
    }
  }
  return {
    maior,
    menor,
    percMaior,
    desvio: percMaior - 50,
    runAtual,
    ladoAtual,
    sinalReversao: runAtual >= 5,
  };
}

export interface MotorCor {
  /** matriz de transição de cores em % */
  matriz: { de: "red" | "black"; para: "red" | "black"; qtd: number; perc: number }[];
  runAtual: number;
  corAtual: string;
  maiorRun: number;
}

export function motorCor(h: Spin[]): MotorCor {
  const val = h.filter((s) => s.num !== 0);
  const counts = new Map<string, number>();
  const origens = new Map<string, number>();
  for (let i = val.length - 1; i > 0; i -= 1) {
    const de = val[i]!.props.cor;
    const para = val[i - 1]!.props.cor;
    counts.set(`${de}_${para}`, (counts.get(`${de}_${para}`) ?? 0) + 1);
    origens.set(de, (origens.get(de) ?? 0) + 1);
  }
  const matriz = (["red", "black"] as const).flatMap((de) =>
    (["red", "black"] as const).map((para) => {
      const qtd = counts.get(`${de}_${para}`) ?? 0;
      const tot = origens.get(de) ?? 1;
      return { de, para, qtd, perc: (qtd / tot) * 100 };
    }),
  );
  let runAtual = 0;
  let maiorRun = 0;
  let atual = 0;
  for (let i = 0; i < val.length; i += 1) {
    if (i === 0 || val[i]!.props.cor === val[i - 1]!.props.cor) atual += 1;
    else atual = 1;
    if (i === 0) runAtual = 1;
    else if (val[i]!.props.cor === val[0]!.props.cor && runAtual === i) runAtual += 1;
    maiorRun = Math.max(maiorRun, atual);
  }
  return {
    matriz,
    runAtual,
    corAtual: val[0]?.props.nomeCor ?? "—",
    maiorRun,
  };
}

export interface TerminalStat {
  terminal: number;
  qtd: number;
  perc: number;
  /** terminal que mais aparece logo depois deste */
  afinidade: number | null;
  afinidadeQtd: number;
}

export function motorTerminais(h: Spin[]): TerminalStat[] {
  const total = h.length || 1;
  const qtds = new Array(10).fill(0) as number[];
  const pares = new Map<string, number>();
  h.forEach((s, i) => {
    const t = s.num % 10;
    qtds[t] = (qtds[t] ?? 0) + 1;
    const prox = h[i - 1];
    if (prox) {
      const key = `${t}_${prox.num % 10}`;
      pares.set(key, (pares.get(key) ?? 0) + 1);
    }
  });
  return qtds
    .map((qtd, terminal) => {
      let afinidade: number | null = null;
      let afinidadeQtd = 0;
      for (let d = 0; d < 10; d += 1) {
        const q = pares.get(`${terminal}_${d}`) ?? 0;
        if (q > afinidadeQtd) {
          afinidadeQtd = q;
          afinidade = d;
        }
      }
      return { terminal, qtd, perc: (qtd / total) * 100, afinidade, afinidadeQtd };
    })
    .sort((a, b) => b.qtd - a.qtd);
}

/* ─────────────────────────── Confluência Tier 1 (Sniper) ────────────────────────── */

export interface Sniper {
  /** zona de 5 casas ao redor do último número */
  zona: number[];
  zonaPerc: number;
  z: number;
  deslocamento: number;
  retencaoSetor: boolean;
  duziaConfirma: boolean;
  colunaConfirma: boolean;
  estrelas: number;
  kelly: number;
  disparo: boolean;
}

export function calcSniper(
  h: Spin[],
  opts: { duziaForte: number; colunaForte: number; limiar?: number },
): Sniper | null {
  const ultimo = h[0];
  if (!ultimo) return null;
  const i = indiceRotor(ultimo.num);
  const zona =
    i < 0
      ? [ultimo.num]
      : [-2, -1, 0, 1, 2].map((d) => CILINDRO[(i + d + CILINDRO.length) % CILINDRO.length]!);
  const set = new Set(zona);
  const qtd = h.filter((s) => set.has(s.num)).length;
  const zonaPerc = (qtd / (h.length || 1)) * 100;
  const z = zScore(zonaPerc, h.length);
  const deslocamento = h[1] ? distanciaAngular(ultimo.num, h[1].num) : 99;
  const retencaoSetor = !!h[1] && h[1].props.setor === ultimo.props.setor && ultimo.props.setor !== "—";
  const duziaConfirma = ultimo.props.duzia === opts.duziaForte;
  const colunaConfirma = ultimo.props.coluna === opts.colunaForte;
  const estrelas =
    (duziaConfirma ? 1 : 0) + (colunaConfirma ? 1 : 0) + (retencaoSetor ? 1 : 0);
  const kelly = kellyFracionado(zonaPerc / 100);
  const limiar = opts.limiar ?? 22.5;
  const disparo =
    h.length >= 20 &&
    zonaPerc >= limiar &&
    z >= 1.65 &&
    deslocamento <= 2 &&
    estrelas >= 3;
  return {
    zona,
    zonaPerc,
    z,
    deslocamento,
    retencaoSetor,
    duziaConfirma,
    colunaConfirma,
    estrelas,
    kelly,
    disparo,
  };
}

/* ─────────────────────────── Mapa de calor do rotor ────────────────────────── */

export function frequenciaRotor(h: Spin[]) {
  const total = h.length || 1;
  const map = new Map<number, number>();
  for (const s of h) map.set(s.num, (map.get(s.num) ?? 0) + 1);
  const max = Math.max(1, ...map.values());
  return CILINDRO.map((num, idx) => {
    const qtd = map.get(num) ?? 0;
    return {
      num,
      idx,
      qtd,
      perc: (qtd / total) * 100,
      intensidade: qtd / max,
      cor: getProps(num).cor,
    };
  });
}

/* ─────────────────────────── Ângulo real no cilindro ────────────────────────── */

/** graus entre duas casas vizinhas do cilindro europeu (360 / 37) */
export const PASSO_ANGULAR = 360 / CILINDRO.length;

/** ângulo real (0..360) do número no cilindro, com o zero na origem */
export function anguloDe(n: number): number {
  const i = indiceRotor(n);
  return i < 0 ? 0 : i * PASSO_ANGULAR;
}

/** menor diferença angular em graus entre dois números (0..180) */
export function anguloEntre(a: number, b: number): number {
  return distanciaAngular(a, b) * PASSO_ANGULAR;
}

/** diferença angular assinada do giro anterior para o atual (-180..180) */
export function deltaAngularAssinado(de: number, para: number): number {
  const ia = indiceRotor(de);
  const ib = indiceRotor(para);
  if (ia < 0 || ib < 0) return 0;
  let d = ib - ia;
  if (d > CILINDRO.length / 2) d -= CILINDRO.length;
  if (d < -CILINDRO.length / 2) d += CILINDRO.length;
  return d * PASSO_ANGULAR;
}
