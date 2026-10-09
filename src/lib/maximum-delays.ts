import type { Spin } from "@/lib/roulette";

export const MAXIMUM_SECTOR_MAP = {
  jeuZero: [12, 35, 3, 26, 0, 32, 15],
  voisins: [22, 18, 29, 7, 28, 19, 4, 21, 2, 25],
  orphelins: [1, 20, 14, 31, 9, 17, 34, 6],
  tiers: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
} as const;

export interface MaximumDelays {
  duzias: Record<1 | 2 | 3, number>;
  colunas: Record<1 | 2 | 3, number>;
  zero: number;
  terminais: Record<number, number>;
  setores: Record<keyof typeof MAXIMUM_SECTOR_MAP, number>;
}

export interface MaximaItem {
  tipo: "Dúzia" | "Coluna" | "Zero" | "Terminal" | "Setor";
  id: string | number;
  nome: string;
  atraso: number;
  maturacao: number; // Percentual de probabilidade cumulativa (1 - (1-p)^k)
  nivel: "normal" | "atencao" | "critico";
}

export interface ProbabilidadeGrupo {
  grupo: 1 | 2 | 3;
  nome: string;
  probabilidade: number; // Percentual ponderado (soma 100%)
  frequencia: number;
  atrasoAtual: number;
  maturacao: number;
}

export interface ProbabilidadeTerminal {
  terminal: number;
  nome: string;
  numeros: number[];
  probabilidade: number; // Percentual ponderado (soma 100%)
  frequencia: number;
  atrasoAtual: number;
  maturacao: number;
}

export interface ProbabilidadeSetor {
  setorKey: keyof typeof MAXIMUM_SECTOR_MAP;
  nome: string;
  qtdNumeros: number;
  numeros: readonly number[];
  probabilidade: number; // Percentual ponderado (soma 100%)
  frequencia: number;
  atrasoAtual: number;
  maturacao: number;
}

export interface AnaliseMaximasEProbabilidades {
  delays: MaximumDelays;
  maximaDoMomento: MaximaItem;
  maximaTotalRegistrada: MaximaItem;
  proximaDuzia: {
    recomendada: ProbabilidadeGrupo;
    itens: ProbabilidadeGrupo[];
    maximaMomento: { grupo: 1 | 2 | 3; atraso: number; maturacao: number };
    maximaTotal: { grupo: 1 | 2 | 3; atraso: number };
  };
  proximaColuna: {
    recomendada: ProbabilidadeGrupo;
    itens: ProbabilidadeGrupo[];
    maximaMomento: { grupo: 1 | 2 | 3; atraso: number; maturacao: number };
    maximaTotal: { grupo: 1 | 2 | 3; atraso: number };
  };
  proximoTerminal: {
    recomendado: ProbabilidadeTerminal;
    itens: ProbabilidadeTerminal[];
    maximaMomento: { terminal: number; atraso: number; maturacao: number };
    maximaTotal: { terminal: number; atraso: number };
  };
  proximoSetor: {
    recomendado: ProbabilidadeSetor;
    itens: ProbabilidadeSetor[];
    maximaMomento: { setor: string; atraso: number; maturacao: number };
    maximaTotal: { setor: string; atraso: number };
  };
  historicoMaximos: MaximumDelays;
}

export function emptyMaximumDelays(): MaximumDelays {
  return {
    duzias: { 1: 0, 2: 0, 3: 0 },
    colunas: { 1: 0, 2: 0, 3: 0 },
    zero: 0,
    terminais: Object.fromEntries(Array.from({ length: 10 }, (_, terminal) => [terminal, 0])),
    setores: { voisins: 0, tiers: 0, orphelins: 0, jeuZero: 0 },
  };
}

function sectorFor(number: number): keyof typeof MAXIMUM_SECTOR_MAP | null {
  if (MAXIMUM_SECTOR_MAP.jeuZero.includes(number as never)) return "jeuZero";
  if (MAXIMUM_SECTOR_MAP.voisins.includes(number as never)) return "voisins";
  if (MAXIMUM_SECTOR_MAP.orphelins.includes(number as never)) return "orphelins";
  if (MAXIMUM_SECTOR_MAP.tiers.includes(number as never)) return "tiers";
  return null;
}

export function updateMaximumDelays(current: MaximumDelays, number: number): MaximumDelays {
  if (!Number.isInteger(number) || number < 0 || number > 36) return current;

  const next: MaximumDelays = {
    duzias: { ...current.duzias },
    colunas: { ...current.colunas },
    zero: number === 0 ? 0 : current.zero + 1,
    terminais: { ...current.terminais },
    setores: { ...current.setores },
  };

  const currentDozen = number === 0 ? 0 : Math.ceil(number / 12);
  const currentColumn = number === 0 ? 0 : number % 3 === 0 ? 3 : number % 3;
  for (const group of [1, 2, 3] as const) {
    next.duzias[group] = group === currentDozen ? 0 : current.duzias[group] + 1;
    next.colunas[group] = group === currentColumn ? 0 : current.colunas[group] + 1;
  }

  const currentTerminal = number % 10;
  for (let terminal = 0; terminal <= 9; terminal += 1) {
    next.terminais[terminal] = terminal === currentTerminal ? 0 : (current.terminais[terminal] ?? 0) + 1;
  }

  const currentSector = sectorFor(number);
  for (const sector of Object.keys(next.setores) as Array<keyof typeof next.setores>) {
    next.setores[sector] = sector === currentSector ? 0 : current.setores[sector] + 1;
  }

  return next;
}

export function calculateMaximumDelays(spins: Spin[]): MaximumDelays {
  return [...spins]
    .reverse()
    .reduce((delays, spin) => updateMaximumDelays(delays, spin.num), emptyMaximumDelays());
}

/**
 * Calcula a probabilidade cumulativa (maturação) de ocorrência após k atrasos
 * P(acerto até k giros) = 1 - (1 - p)^k
 */
export function calcularMaturacao(atraso: number, p = 12 / 37): number {
  if (atraso <= 0) return 0;
  return (1 - Math.pow(1 - p, atraso)) * 100;
}

const SETOR_NOMES: Record<keyof typeof MAXIMUM_SECTOR_MAP, string> = {
  jeuZero: "Jogo Zero (7 nºs)",
  voisins: "Vizinhos do Zero (10 nºs)",
  orphelins: "Órfãos (8 nºs)",
  tiers: "Terço do Cilindro (12 nºs)",
};

/**
 * Análise completa: atrasos atuais, máxima do momento, máxima histórica registrada
 * e probabilidade preditiva para Dúzias, Colunas, Terminais 0-9 e Setores da Roleta.
 */
export function analisarMaximasCompletas(spins: Spin[]): AnaliseMaximasEProbabilidades {
  const cronologico = [...spins].reverse();
  let currentDelays = emptyMaximumDelays();
  const peakDelays = emptyMaximumDelays();

  // Rastrear histórico de picos máximos absolutos
  for (const spin of cronologico) {
    currentDelays = updateMaximumDelays(currentDelays, spin.num);

    for (const g of [1, 2, 3] as const) {
      peakDelays.duzias[g] = Math.max(peakDelays.duzias[g], currentDelays.duzias[g]);
      peakDelays.colunas[g] = Math.max(peakDelays.colunas[g], currentDelays.colunas[g]);
    }
    peakDelays.zero = Math.max(peakDelays.zero, currentDelays.zero);
    for (let t = 0; t <= 9; t++) {
      peakDelays.terminais[t] = Math.max(peakDelays.terminais[t] ?? 0, currentDelays.terminais[t] ?? 0);
    }
    for (const s of Object.keys(peakDelays.setores) as Array<keyof typeof peakDelays.setores>) {
      peakDelays.setores[s] = Math.max(peakDelays.setores[s], currentDelays.setores[s]);
    }
  }

  // 1. Identificar a Máxima Geral do Momento
  const itensAtuais: MaximaItem[] = [
    ...([1, 2, 3] as const).map((g) => ({
      tipo: "Dúzia" as const,
      id: g,
      nome: `${g}ª Dúzia (${g === 1 ? "1-12" : g === 2 ? "13-24" : "25-36"})`,
      atraso: currentDelays.duzias[g],
      maturacao: calcularMaturacao(currentDelays.duzias[g], 12 / 37),
      nivel: currentDelays.duzias[g] >= 10 ? ("critico" as const) : currentDelays.duzias[g] >= 6 ? ("atencao" as const) : ("normal" as const),
    })),
    ...([1, 2, 3] as const).map((g) => ({
      tipo: "Coluna" as const,
      id: g,
      nome: `${g}ª Coluna`,
      atraso: currentDelays.colunas[g],
      maturacao: calcularMaturacao(currentDelays.colunas[g], 12 / 37),
      nivel: currentDelays.colunas[g] >= 10 ? ("critico" as const) : currentDelays.colunas[g] >= 6 ? ("atencao" as const) : ("normal" as const),
    })),
    ...Object.entries(MAXIMUM_SECTOR_MAP).map(([sKey, nums]) => {
      const k = sKey as keyof typeof MAXIMUM_SECTOR_MAP;
      return {
        tipo: "Setor" as const,
        id: k,
        nome: SETOR_NOMES[k],
        atraso: currentDelays.setores[k],
        maturacao: calcularMaturacao(currentDelays.setores[k], nums.length / 37),
        nivel: currentDelays.setores[k] >= 12 ? ("critico" as const) : currentDelays.setores[k] >= 8 ? ("atencao" as const) : ("normal" as const),
      };
    }),
    {
      tipo: "Zero" as const,
      id: 0,
      nome: "Número Zero (0)",
      atraso: currentDelays.zero,
      maturacao: calcularMaturacao(currentDelays.zero, 1 / 37),
      nivel: currentDelays.zero >= 60 ? ("critico" as const) : currentDelays.zero >= 36 ? ("atencao" as const) : ("normal" as const),
    },
  ];
  itensAtuais.sort((a, b) => b.atraso - a.atraso);
  const maximaDoMomento = itensAtuais[0] ?? {
    tipo: "Dúzia" as const,
    id: 1,
    nome: "1ª Dúzia",
    atraso: 0,
    maturacao: 0,
    nivel: "normal" as const,
  };

  // 2. Identificar a Máxima Geral Total Registrada (Recorde Histórico da Sessão)
  const itensHistoricos: MaximaItem[] = [
    ...([1, 2, 3] as const).map((g) => ({
      tipo: "Dúzia" as const,
      id: g,
      nome: `${g}ª Dúzia`,
      atraso: peakDelays.duzias[g],
      maturacao: calcularMaturacao(peakDelays.duzias[g], 12 / 37),
      nivel: "critico" as const,
    })),
    ...([1, 2, 3] as const).map((g) => ({
      tipo: "Coluna" as const,
      id: g,
      nome: `${g}ª Coluna`,
      atraso: peakDelays.colunas[g],
      maturacao: calcularMaturacao(peakDelays.colunas[g], 12 / 37),
      nivel: "critico" as const,
    })),
    ...Object.entries(MAXIMUM_SECTOR_MAP).map(([sKey, nums]) => {
      const k = sKey as keyof typeof MAXIMUM_SECTOR_MAP;
      return {
        tipo: "Setor" as const,
        id: k,
        nome: SETOR_NOMES[k],
        atraso: peakDelays.setores[k],
        maturacao: calcularMaturacao(peakDelays.setores[k], nums.length / 37),
        nivel: "critico" as const,
      };
    }),
    {
      tipo: "Zero" as const,
      id: 0,
      nome: "Zero (0)",
      atraso: peakDelays.zero,
      maturacao: calcularMaturacao(peakDelays.zero, 1 / 37),
      nivel: "critico" as const,
    },
  ];
  itensHistoricos.sort((a, b) => b.atraso - a.atraso);
  const maximaTotalRegistrada = itensHistoricos[0] ?? {
    tipo: "Dúzia" as const,
    id: 1,
    nome: "1ª Dúzia",
    atraso: 0,
    maturacao: 0,
    nivel: "normal" as const,
  };

  const totalGiros = spins.length || 1;
  const totalValidos = spins.filter((s) => s.num !== 0).length || 1;

  // 3. Probabilidade para a Próxima Dúzia
  const freqDuzias: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  const freqColunas: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };

  for (const s of spins) {
    if (s.num === 0) continue;
    const d = Math.ceil(s.num / 12) as 1 | 2 | 3;
    const c = (s.num % 3 === 0 ? 3 : s.num % 3) as 1 | 2 | 3;
    if (d in freqDuzias) freqDuzias[d]++;
    if (c in freqColunas) freqColunas[c]++;
  }

  const pesoDuzias = ([1, 2, 3] as const).map((g) => {
    const atraso = currentDelays.duzias[g];
    const freq = freqDuzias[g];
    const media = totalValidos / 3;
    const peso = 1 + (atraso * 0.15) + Math.max(0, ((media - freq) / (media + 1)) * 0.4);
    return { g, peso, atraso, freq, maturacao: calcularMaturacao(atraso, 12 / 37) };
  });
  const somaPesoDuzias = pesoDuzias.reduce((acc, p) => acc + p.peso, 0);

  const itensDuzias: ProbabilidadeGrupo[] = pesoDuzias.map((p) => ({
    grupo: p.g,
    nome: `${p.g}ª Dúzia (${p.g === 1 ? "1-12" : p.g === 2 ? "13-24" : "25-36"})`,
    probabilidade: (p.peso / somaPesoDuzias) * 100,
    frequencia: p.freq,
    atrasoAtual: p.atraso,
    maturacao: p.maturacao,
  }));
  itensDuzias.sort((a, b) => b.probabilidade - a.probabilidade);

  const duziaMaxMomento = ([1, 2, 3] as const)
    .map((g) => ({ grupo: g, atraso: currentDelays.duzias[g], maturacao: calcularMaturacao(currentDelays.duzias[g], 12 / 37) }))
    .sort((a, b) => b.atraso - a.atraso)[0];

  const duziaMaxTotal = ([1, 2, 3] as const)
    .map((g) => ({ grupo: g, atraso: peakDelays.duzias[g] }))
    .sort((a, b) => b.atraso - a.atraso)[0];

  // 4. Probabilidade para a Próxima Coluna
  const pesoColunas = ([1, 2, 3] as const).map((g) => {
    const atraso = currentDelays.colunas[g];
    const freq = freqColunas[g];
    const media = totalValidos / 3;
    const peso = 1 + (atraso * 0.15) + Math.max(0, ((media - freq) / (media + 1)) * 0.4);
    return { g, peso, atraso, freq, maturacao: calcularMaturacao(atraso, 12 / 37) };
  });
  const somaPesoColunas = pesoColunas.reduce((acc, p) => acc + p.peso, 0);

  const itensColunas: ProbabilidadeGrupo[] = pesoColunas.map((p) => ({
    grupo: p.g,
    nome: `${p.g}ª Coluna`,
    probabilidade: (p.peso / somaPesoColunas) * 100,
    frequencia: p.freq,
    atrasoAtual: p.atraso,
    maturacao: p.maturacao,
  }));
  itensColunas.sort((a, b) => b.probabilidade - a.probabilidade);

  const colunaMaxMomento = ([1, 2, 3] as const)
    .map((g) => ({ grupo: g, atraso: currentDelays.colunas[g], maturacao: calcularMaturacao(currentDelays.colunas[g], 12 / 37) }))
    .sort((a, b) => b.atraso - a.atraso)[0];

  const colunaMaxTotal = ([1, 2, 3] as const)
    .map((g) => ({ grupo: g, atraso: peakDelays.colunas[g] }))
    .sort((a, b) => b.atraso - a.atraso)[0];

  // 5. Probabilidade para os Terminais 0-9
  const freqTerminais: Record<number, number> = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [i, 0])
  );
  for (const s of spins) {
    const t = s.num % 10;
    freqTerminais[t] = (freqTerminais[t] ?? 0) + 1;
  }

  const pesoTerminais = Array.from({ length: 10 }, (_, t) => {
    // Terminais 0..6 possuem 4 números na roleta; 7..9 possuem 3 números
    const numeros = Array.from({ length: 37 }, (_, i) => i).filter((n) => n % 10 === t);
    const pBase = numeros.length / 37;
    const atraso = currentDelays.terminais[t] ?? 0;
    const freq = freqTerminais[t] ?? 0;
    const esperado = totalGiros * pBase;
    const peso = pBase * (1 + (atraso * 0.12) + Math.max(0, ((esperado - freq) / (esperado + 1)) * 0.4));
    return {
      t,
      numeros,
      peso,
      atraso,
      freq,
      maturacao: calcularMaturacao(atraso, pBase),
    };
  });
  const somaPesoTerminais = pesoTerminais.reduce((acc, p) => acc + p.peso, 0);

  const itensTerminais: ProbabilidadeTerminal[] = pesoTerminais.map((p) => ({
    terminal: p.t,
    nome: `Terminal ${p.t} (${p.numeros.join(", ")})`,
    numeros: p.numeros,
    probabilidade: (p.peso / somaPesoTerminais) * 100,
    frequencia: p.freq,
    atrasoAtual: p.atraso,
    maturacao: p.maturacao,
  }));
  itensTerminais.sort((a, b) => b.probabilidade - a.probabilidade);

  const terminalMaxMomento = Array.from({ length: 10 }, (_, t) => ({
    terminal: t,
    atraso: currentDelays.terminais[t] ?? 0,
    maturacao: calcularMaturacao(currentDelays.terminais[t] ?? 0, (t <= 6 ? 4 : 3) / 37),
  })).sort((a, b) => b.atraso - a.atraso)[0];

  const terminalMaxTotal = Array.from({ length: 10 }, (_, t) => ({
    terminal: t,
    atraso: peakDelays.terminais[t] ?? 0,
  })).sort((a, b) => b.atraso - a.atraso)[0];

  // 6. Probabilidade para os Setores da Roleta
  const freqSetores: Record<keyof typeof MAXIMUM_SECTOR_MAP, number> = {
    jeuZero: 0,
    voisins: 0,
    orphelins: 0,
    tiers: 0,
  };
  for (const s of spins) {
    const setor = sectorFor(s.num);
    if (setor && setor in freqSetores) {
      freqSetores[setor]++;
    }
  }

  const pesoSetores = (Object.keys(MAXIMUM_SECTOR_MAP) as Array<keyof typeof MAXIMUM_SECTOR_MAP>).map((k) => {
    const nums = MAXIMUM_SECTOR_MAP[k];
    const pBase = nums.length / 37;
    const atraso = currentDelays.setores[k];
    const freq = freqSetores[k];
    const esperado = totalGiros * pBase;
    const peso = pBase * (1 + (atraso * 0.15) + Math.max(0, ((esperado - freq) / (esperado + 1)) * 0.4));
    return {
      k,
      nums,
      peso,
      atraso,
      freq,
      maturacao: calcularMaturacao(atraso, pBase),
    };
  });
  const somaPesoSetores = pesoSetores.reduce((acc, p) => acc + p.peso, 0);

  const itensSetores: ProbabilidadeSetor[] = pesoSetores.map((p) => ({
    setorKey: p.k,
    nome: SETOR_NOMES[p.k],
    qtdNumeros: p.nums.length,
    numeros: p.nums,
    probabilidade: (p.peso / somaPesoSetores) * 100,
    frequencia: p.freq,
    atrasoAtual: p.atraso,
    maturacao: p.maturacao,
  }));
  itensSetores.sort((a, b) => b.probabilidade - a.probabilidade);

  const setorMaxMomento = (Object.keys(MAXIMUM_SECTOR_MAP) as Array<keyof typeof MAXIMUM_SECTOR_MAP>)
    .map((k) => ({
      setor: SETOR_NOMES[k],
      atraso: currentDelays.setores[k],
      maturacao: calcularMaturacao(currentDelays.setores[k], MAXIMUM_SECTOR_MAP[k].length / 37),
    }))
    .sort((a, b) => b.atraso - a.atraso)[0];

  const setorMaxTotal = (Object.keys(MAXIMUM_SECTOR_MAP) as Array<keyof typeof MAXIMUM_SECTOR_MAP>)
    .map((k) => ({
      setor: SETOR_NOMES[k],
      atraso: peakDelays.setores[k],
    }))
    .sort((a, b) => b.atraso - a.atraso)[0];

  return {
    delays: currentDelays,
    maximaDoMomento,
    maximaTotalRegistrada,
    proximaDuzia: {
      recomendada: itensDuzias[0]!,
      itens: itensDuzias,
      maximaMomento: duziaMaxMomento!,
      maximaTotal: duziaMaxTotal!,
    },
    proximaColuna: {
      recomendada: itensColunas[0]!,
      itens: itensColunas,
      maximaMomento: colunaMaxMomento!,
      maximaTotal: colunaMaxTotal!,
    },
    proximoTerminal: {
      recomendado: itensTerminais[0]!,
      itens: itensTerminais,
      maximaMomento: terminalMaxMomento!,
      maximaTotal: terminalMaxTotal!,
    },
    proximoSetor: {
      recomendado: itensSetores[0]!,
      itens: itensSetores,
      maximaMomento: setorMaxMomento!,
      maximaTotal: setorMaxTotal!,
    },
    historicoMaximos: peakDelays,
  };
}