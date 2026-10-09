export type Cor = "red" | "black" | "green";

export const REDS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];
export const VOISINS = [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25];
export const TIERS = [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33];
export const ORPHELINS = [1, 20, 14, 31, 9, 17, 34, 6];

export interface SectorDef {
  id?: string;
  name: string;
  numbers: number[];
}

export const SETORES_PADRAO: SectorDef[] = [
  { name: "Voisins", numbers: VOISINS },
  { name: "Tiers", numbers: TIERS },
  { name: "Orphelins", numbers: ORPHELINS },
];

export interface SpinProps {
  cor: Cor;
  nomeCor: string;
  duzia: number;
  coluna: number;
  linha: number;
  setor: string;
}

export interface Spin {
  id: string;
  num: number;
  props: SpinProps;
  createdAt: string;
}

function acharSetor(n: number, setores: SectorDef[]): string {
  return setores.find((s) => s.numbers.includes(n))?.name ?? "—";
}

export function getProps(n: number, setores: SectorDef[] = SETORES_PADRAO): SpinProps {
  if (n === 0) {
    return {
      cor: "green",
      nomeCor: "VERDE",
      duzia: 0,
      coluna: 0,
      linha: 0,
      setor: acharSetor(0, setores),
    };
  }
  const cor: Cor = REDS.includes(n) ? "red" : "black";
  return {
    cor,
    nomeCor: cor === "red" ? "VERMELHO" : "PRETO",
    duzia: n <= 12 ? 1 : n <= 24 ? 2 : 3,
    coluna: n % 3 === 1 ? 1 : n % 3 === 2 ? 2 : 3,
    linha: Math.ceil(n / 3),
    setor: acharSetor(n, setores),
  };
}

/** Regras configuráveis pelo painel de administração */
export type PatternRule =
  | { type: "colors"; sequence: Cor[] }
  | { type: "sectors"; sequence: string[] }
  | { type: "numbers"; sequence: number[] }
  | { type: "repeat_dozen"; count: number }
  | { type: "repeat_column"; count: number }
  | { type: "repeat_color"; count: number }
  | { type: "repeat_terminal_gap"; count: number };

export const TIPOS_REGRA: { value: PatternRule["type"]; label: string }[] = [
  { value: "colors", label: "Sequência de cores" },
  { value: "sectors", label: "Sequência de setores" },
  { value: "numbers", label: "Sequência de números" },
  { value: "repeat_dozen", label: "Dúzia repetida" },
  { value: "repeat_column", label: "Coluna repetida" },
  { value: "repeat_color", label: "Cor repetida" },
  {
    value: "repeat_terminal_gap",
    label: "Número repetido → terminal menos 1 casa",
  },
];

export interface Padrao {
  id: string;
  code: string;
  nome: string;
  alvos: string;
  regra: PatternRule;
  ativa: boolean;
  position: number;
}

export const PADROES_PADRAO: Padrao[] = [
  {
    id: "p1",
    code: "P1",
    nome: "Alternância de Cor Dupla",
    alvos: "19, 29, 17, 7, 15",
    regra: { type: "colors", sequence: ["red", "black", "red"] },
    ativa: true,
    position: 1,
  },
  {
    id: "p2",
    code: "P2",
    nome: "Dúzia Repetida",
    alvos: "Menor 0, Maior 30",
    regra: { type: "repeat_dozen", count: 2 },
    ativa: true,
    position: 2,
  },
  {
    id: "p3",
    code: "P3",
    nome: "Tiers → Voisins",
    alvos: "0, 10, 20, 30, 28, 19, 26, 32",
    regra: { type: "sectors", sequence: ["Tiers", "Voisins"] },
    ativa: true,
    position: 3,
  },
  {
    id: "p4",
    code: "P4",
    nome: "Gatilho do Zero",
    alvos: "19, 4, 21, 2, 25, 17, 34",
    regra: { type: "numbers", sequence: [0] },
    ativa: true,
    position: 4,
  },
];

/** h: index 0 = mais recente */
export function checarRegra(h: Spin[], regra: PatternRule): boolean {
  switch (regra.type) {
    case "colors":
      return (
        regra.sequence.length > 0 &&
        h.length >= regra.sequence.length &&
        regra.sequence.every((c, i) => h[i]!.props.cor === c)
      );
    case "sectors":
      return (
        regra.sequence.length > 0 &&
        h.length >= regra.sequence.length &&
        regra.sequence.every((s, i) => h[i]!.props.setor === s)
      );
    case "numbers":
      return (
        regra.sequence.length > 0 &&
        h.length >= regra.sequence.length &&
        regra.sequence.every((n, i) => h[i]!.num === n)
      );
    case "repeat_dozen": {
      const c = Math.max(2, regra.count || 2);
      if (h.length < c || h[0]!.props.duzia === 0) return false;
      return h.slice(0, c).every((s) => s.props.duzia === h[0]!.props.duzia);
    }
    case "repeat_column": {
      const c = Math.max(2, regra.count || 2);
      if (h.length < c || h[0]!.props.coluna === 0) return false;
      return h.slice(0, c).every((s) => s.props.coluna === h[0]!.props.coluna);
    }
    case "repeat_color": {
      const c = Math.max(2, regra.count || 2);
      if (h.length < c) return false;
      return h.slice(0, c).every((s) => s.props.cor === h[0]!.props.cor);
    }
    case "repeat_terminal_gap": {
      const info = calcRepetidoGap(h, regra.count);
      return info !== null && info.faltam === 1;
    }
    default:
      return false;
  }
}

export interface RepetidoGap {
  /** número que repetiu */
  numero: number;
  /** segundo dígito do número repetido */
  terminal: number;
  /** casas a contar após a repetição (terminal - 1) */
  casas: number;
  /** giros já ocorridos depois da repetição */
  decorridos: number;
  /** quantos giros faltam até a casa de entrada (1 = próximo giro) */
  faltam: number;
}

/**
 * Gatilho de número repetido: usa o segundo dígito do número (26 → 6),
 * desconta uma casa (6 - 1 = 5) e marca a entrada nessa casa após a repetição.
 * h: index 0 = mais recente. `janela` = até quantos giros atrás procurar a repetição.
 */
export function calcRepetidoGap(h: Spin[], janela = 12): RepetidoGap | null {
  const alcance = Math.max(2, janela || 12);
  for (let i = 0; i < h.length; i += 1) {
    const numero = h[i]!.num;
    const repetiu = h.slice(i + 1, i + 1 + alcance).some((s) => s.num === numero);
    if (!repetiu) continue;
    const terminal = numero % 10;
    const casas = terminal - 1;
    if (casas < 1) return null;
    const decorridos = i;
    const faltam = casas - decorridos;
    if (faltam < 1) return null;
    return { numero, terminal, casas, decorridos, faltam };
  }
  return null;
}

export function detectarPadroes(h: Spin[], padroes: Padrao[] = PADROES_PADRAO) {
  return padroes.map((p) => ({ padrao: p, ativo: p.ativa && checarRegra(h, p.regra) }));
}

export interface DesempenhoPadrao {
  total: number;
  wins: number;
  perc: number;
  winsAte2: number;
  percAte2: number;
  ultimo: { win: boolean; entrada: number | null } | null;
  historico: { win: boolean; entrada: number | null }[];
}

/**
 * Mede o resultado real de um padrão: após cada ocorrência, considera WIN
 * quando um dos números-alvo aparece em até três giros seguintes,
 * destacando também a assertividade considerando até 2 entradas (G1).
 */
export function calcDesempenhoPadrao(h: Spin[], padrao: Padrao): DesempenhoPadrao {
  const alvos = new Set(
    (padrao.alvos.match(/\d+/g) ?? [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 36),
  );
  if (alvos.size === 0) return { total: 0, wins: 0, perc: 0, winsAte2: 0, percAte2: 0, ultimo: null, historico: [] };

  const cronologico = [...h].reverse();
  const resultados: { win: boolean; entrada: number | null }[] = [];

  for (let i = 0; i < cronologico.length; i += 1) {
    const ateOcorrencia = cronologico.slice(0, i + 1).reverse();
    if (!checarRegra(ateOcorrencia, padrao.regra)) continue;

    const proximos = cronologico.slice(i + 1, i + 4);
    const acerto = proximos.findIndex((spin) => alvos.has(spin.num));
    if (acerto >= 0) {
      resultados.push({ win: true, entrada: acerto + 1 });
    } else if (proximos.length === 3) {
      resultados.push({ win: false, entrada: null });
    }
  }

  const wins = resultados.filter((resultado) => resultado.win).length;
  const winsAte2 = resultados.filter((resultado) => resultado.win && resultado.entrada !== null && resultado.entrada <= 2).length;
  return {
    total: resultados.length,
    wins,
    perc: resultados.length > 0 ? (wins / resultados.length) * 100 : 0,
    winsAte2,
    percAte2: resultados.length > 0 ? (winsAte2 / resultados.length) * 100 : 0,
    ultimo: resultados.at(-1) ?? null,
    historico: resultados.slice(-8).reverse(),
  };
}

export interface AssertividadeAlvosG1 {
  total: number;
  wins: number;
  perc: number;
  ultimo: { win: boolean; entrada: 1 | 2 | null } | null;
  ultimoResultado: "GREEN" | "RED" | "—";
}

/**
 * Calcula a taxa de acerto em até 2 entradas (Gale 1) para um conjunto de alvos
 * no histórico de giros (após ocorrência de gatilho ou em janelas de 2 giros),
 * registrando se o último teste resultou em GREEN ou RED.
 */
export function calcAssertividadeAlvosEm2Entradas(
  h: Spin[],
  alvosArray: number[],
  triggerNumber?: number | null,
): AssertividadeAlvosG1 {
  const alvos = new Set(alvosArray);
  if (alvos.size === 0 || h.length < 2) {
    return { total: 0, wins: 0, perc: 0, ultimo: null, ultimoResultado: "—" };
  }

  const cronologico = [...h].reverse();
  const resultados: { win: boolean; entrada: 1 | 2 | null }[] = [];
  let total = 0;
  let wins = 0;

  for (let i = 0; i < cronologico.length - 1; i += 1) {
    if (triggerNumber !== undefined && triggerNumber !== null) {
      if (cronologico[i]?.num !== triggerNumber) continue;
    }
    const s1 = cronologico[i + 1];
    const s2 = cronologico[i + 2];
    if (!s1) continue;

    total += 1;
    if (alvos.has(s1.num)) {
      wins += 1;
      resultados.push({ win: true, entrada: 1 });
    } else if (s2 && alvos.has(s2.num)) {
      wins += 1;
      resultados.push({ win: true, entrada: 2 });
    } else {
      resultados.push({ win: false, entrada: null });
    }
  }

  const ultimo = resultados.length > 0 ? (resultados[resultados.length - 1] ?? null) : null;
  const ultimoResultado: "GREEN" | "RED" | "—" = ultimo ? (ultimo.win ? "GREEN" : "RED") : "—";

  return {
    total,
    wins,
    perc: total > 0 ? (wins / total) * 100 : 0,
    ultimo,
    ultimoResultado,
  };
}

export interface PullRules {
  minCount: number;
  topN: number;
  windowSize: number;
}

export const PULL_RULES_PADRAO: PullRules = { minCount: 1, topN: 10, windowSize: 500 };

export interface Transicao {
  origem: number;
  destino: number;
  qtd: number;
  perc: number;
}

/** history ordenado do mais recente para o mais antigo */
export function calcTransicoes(h: Spin[], regras: PullRules = PULL_RULES_PADRAO): Transicao[] {
  const janela = h.slice(0, Math.max(2, regras.windowSize));
  const counts = new Map<string, number>();
  const origCounts = new Map<number, number>();
  for (let i = janela.length - 1; i > 0; i--) {
    const origem = janela[i]!.num;
    const destino = janela[i - 1]!.num;
    const key = `${origem}_${destino}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    origCounts.set(origem, (origCounts.get(origem) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, qtd]) => {
      const [o, d] = key.split("_").map(Number) as [number, number];
      const total = origCounts.get(o) ?? 1;
      return { origem: o, destino: d, qtd, perc: (qtd / total) * 100 };
    })
    .filter((t) => t.qtd >= Math.max(1, regras.minCount))
    .sort((a, b) => b.qtd - a.qtd || b.perc - a.perc)
    .slice(0, Math.max(1, regras.topN));
}

export function contarPor<T extends string | number>(
  h: Spin[],
  pick: (s: Spin) => T,
): { key: T; qtd: number; perc: number }[] {
  const map = new Map<T, number>();
  for (const s of h) {
    const k = pick(s);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const total = h.length || 1;
  return [...map.entries()].map(([key, qtd]) => ({ key, qtd, perc: (qtd / total) * 100 }));
}

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface GrupoStat {
  idx: number;
  nome: string;
  qtd: number;
  perc: number;
}

export interface GruposStats {
  duzias: GrupoStat[];
  colunas: GrupoStat[];
  /** ordenados do mais forte para o mais fraco */
  favDuzias: GrupoStat[];
  favColunas: GrupoStat[];
  /** diferença percentual entre o 1º e o 2º colocado */
  distDuzias: number;
  distColunas: number;
  total: number;
}

export function calcGrupos(h: Spin[]): GruposStats {
  const val = h.filter((s) => s.num !== 0);
  const total = val.length || 1;
  const duzias = [1, 2, 3].map((d) => {
    const qtd = val.filter((s) => s.props.duzia === d).length;
    return { idx: d, nome: `${d}ª Dúzia`, qtd, perc: (qtd / total) * 100 };
  });
  const colunas = [1, 2, 3].map((c) => {
    const qtd = val.filter((s) => s.props.coluna === c).length;
    return { idx: c, nome: `${c}ª Coluna`, qtd, perc: (qtd / total) * 100 };
  });
  const favDuzias = [...duzias].sort((a, b) => b.perc - a.perc);
  const favColunas = [...colunas].sort((a, b) => b.perc - a.perc);
  return {
    duzias,
    colunas,
    favDuzias,
    favColunas,
    distDuzias: (favDuzias[0]?.perc ?? 0) - (favDuzias[1]?.perc ?? 0),
    distColunas: (favColunas[0]?.perc ?? 0) - (favColunas[1]?.perc ?? 0),
    total: val.length,
  };
}

/** Distorção mínima considerada saudável para entrada */
export const DISTORCAO_MINIMA = 5;

/** Ordem física da roleta europeia (sentido horário) */
export const CILINDRO = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

/** Número + k vizinhos físicos de cada lado */
export function vizinhos(n: number, k = 2): number[] {
  const i = CILINDRO.indexOf(n);
  if (i < 0) return [n];
  const out: number[] = [];
  for (let d = -k; d <= k; d++) {
    out.push(CILINDRO[(i + d + CILINDRO.length * 2) % CILINDRO.length]!);
  }
  return out;
}

export interface Zona {
  numeros: number[];
  qtd: number;
  perc: number;
}

/** Frequência da zona física (número + 2 vizinhos de cada lado) */
export function calcZona(h: Spin[], n: number, k = 2): Zona {
  const numeros = vizinhos(n, k);
  const set = new Set(numeros);
  const qtd = h.filter((s) => set.has(s.num)).length;
  return { numeros, qtd, perc: (qtd / (h.length || 1)) * 100 };
}

/** Números mais quentes do histórico */
export function numerosQuentes(h: Spin[], top = 5): { num: number; qtd: number; perc: number }[] {
  const map = new Map<number, number>();
  for (const s of h) map.set(s.num, (map.get(s.num) ?? 0) + 1);
  const total = h.length || 1;
  return [...map.entries()]
    .map(([num, qtd]) => ({ num, qtd, perc: (qtd / total) * 100 }))
    .sort((a, b) => b.qtd - a.qtd || a.num - b.num)
    .slice(0, top);
}


export interface Tendencia {
  nome: string;
  qtd: number;
  perc: number;
}

export interface Tendencias {
  cor: Tendencia;
  paridade: Tendencia;
  maiorMenor: Tendencia;
  total: number;
}

/** Cor, paridade e alto/baixo mais fortes considerando apenas giros reais (zero fora) */
export function calcTendencias(h: Spin[]): Tendencias {
  const val = h.filter((s) => s.num !== 0);
  const total = val.length || 1;
  const vermelho = val.filter((s) => s.props.cor === "red").length;
  const preto = val.length - vermelho;
  const par = val.filter((s) => s.num % 2 === 0).length;
  const impar = val.length - par;
  const alto = val.filter((s) => s.num >= 19).length;
  const baixo = val.length - alto;
  const corQtd = Math.max(vermelho, preto);
  const parQtd = Math.max(par, impar);
  const mmQtd = Math.max(alto, baixo);
  return {
    cor: {
      nome: vermelho >= preto ? "VERMELHO" : "PRETO",
      qtd: corQtd,
      perc: (corQtd / total) * 100,
    },
    paridade: { nome: par >= impar ? "PAR" : "ÍMPAR", qtd: parQtd, perc: (parQtd / total) * 100 },
    maiorMenor: { nome: alto >= baixo ? "MAIOR" : "MENOR", qtd: mmQtd, perc: (mmQtd / total) * 100 },
    total: val.length,
  };
}

/** Número que o último giro mais puxa historicamente */
export function melhorPuxada(
  h: Spin[],
  origem: number,
  regras: PullRules = PULL_RULES_PADRAO,
): Transicao | null {
  const todas = calcTransicoes(h, { ...regras, minCount: 1, topN: 2000 });
  return todas.filter((t) => t.origem === origem).sort((a, b) => b.qtd - a.qtd)[0] ?? null;
}

export interface EstatNum {
  num: number;
  qtd: number;
  perc: number;
  maiorEspera: number;
  esperaAtual: number;
}

/** Estatísticas por número: saídas, maior espera (máxima) e espera atual (em giros) */
export function calcEstatisticas(spins: Spin[]): EstatNum[] {
  const cronologico = [...spins].reverse().map((s) => s.num);
  const total = cronologico.length || 1;
  return Array.from({ length: 37 }, (_, num) => {
    let qtd = 0;
    let maiorEspera = 0;
    let ultimoIdx = -1;
    cronologico.forEach((v, i) => {
      if (v !== num) return;
      qtd += 1;
      const espera = ultimoIdx < 0 ? i : i - ultimoIdx - 1;
      if (espera > maiorEspera) maiorEspera = espera;
      ultimoIdx = i;
    });
    const esperaAtual = ultimoIdx < 0 ? cronologico.length : cronologico.length - ultimoIdx - 1;
    if (esperaAtual > maiorEspera) maiorEspera = esperaAtual;
    return { num, qtd, perc: (qtd / total) * 100, maiorEspera, esperaAtual };
  });
}

