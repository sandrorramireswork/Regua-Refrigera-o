import {
  CILINDRO,
  VOISINS,
  TIERS,
  ORPHELINS,
  getProps,
  vizinhos,
  type Spin,
} from "./roulette";

/* ═════════════════════════════════════════════════════════════════════
   1. SÍNTESE DE ÁUDIO VIA WEB AUDIO API
   ═════════════════════════════════════════════════════════════════════ */

/**
 * Alerta sonoro desativado para o Radar de Densidade e Espelho & Raiz.
 */
export function playNeonAlertSound(): void {
  // Desativado a pedido do usuário
  return;
}

/* ═════════════════════════════════════════════════════════════════════
   2. MATRIZ DE ESPELHOS E RAÍZES NUMÉRICAS
   ═════════════════════════════════════════════════════════════════════ */

/** Mapeamento estrito das 9 Raízes de Redução (1 a 9) */
export const MAPA_RAIZES: Record<number, number[]> = {
  1: [1, 10, 19, 28],
  2: [2, 11, 20, 29],
  3: [3, 12, 21, 30],
  4: [4, 13, 22, 31],
  5: [5, 14, 23, 32],
  6: [6, 15, 24, 33],
  7: [7, 16, 25, 34],
  8: [8, 17, 26, 35],
  9: [9, 18, 27, 36],
};

/** Mapeamento de Inversões (Espelhos Diretos) */
export const MAPA_INVERSOES: [number, number][] = [
  [12, 21],
  [13, 31],
  [23, 32],
];

/**
 * Calcula a raiz digital (redução de dígitos) de 1 a 9.
 * Retorna 0 para o zero verde.
 */
export function calcularRaizDigital(num: number): number {
  if (num === 0) return 0;
  return ((num - 1) % 9) + 1;
}

export interface MirrorSignal {
  id: string;
  tipo: "inversao" | "raiz";
  raiz: number;
  gatilhos: number[];
  alvosPrincipais: number[];
  alvosMestres: number[];
  todosAlvos: number[];
  confianca: number;
  tags: string[];
  justificativa: string;
  detalheFisico: string;
  timestamp: number;
  spinTriggerId: string;
}

/* ═════════════════════════════════════════════════════════════════════
   3. CLASSE RouletteTracker
   ═════════════════════════════════════════════════════════════════════ */

export class RouletteTracker {
  private spins: Spin[];

  constructor(spins: Spin[]) {
    this.spins = spins;
  }

  /** Retorna a fatia de giros da janela curta */
  getJanelaCurta(tamanho: number = 7): Spin[] {
    const lim = Math.max(5, Math.min(30, tamanho));
    return this.spins.slice(0, Math.min(lim, this.spins.length));
  }

  /** Retorna o último número sorteado */
  getUltimoNumero(): number | undefined {
    return this.spins[0]?.num;
  }

  /** Retorna as frequências de cada setor nos giros recentes */
  getSetoresQuentes(janela: number = 15): {
    voisinsRatio: number;
    tiersRatio: number;
    orphelinsRatio: number;
  } {
    const amostra = this.spins.slice(0, Math.min(janela, this.spins.length));
    const total = amostra.length || 1;
    let v = 0, t = 0, o = 0;
    amostra.forEach((s) => {
      if (VOISINS.includes(s.num)) v++;
      else if (TIERS.includes(s.num)) t++;
      else if (ORPHELINS.includes(s.num)) o++;
    });

    const vExp = (total * 17) / 37;
    const tExp = (total * 12) / 37;
    const oExp = (total * 8) / 37;

    return {
      voisinsRatio: v / (vExp || 1),
      tiersRatio: t / (tExp || 1),
      orphelinsRatio: o / (oExp || 1),
    };
  }

  /** Verifica se um número está nos vizinhos do último resultado */
  isVizinhoFisicoRecente(num: number, casas: number = 2): boolean {
    const ultimo = this.getUltimoNumero();
    if (ultimo === undefined) return false;
    const viz = vizinhos(ultimo, casas);
    return viz.includes(num);
  }
}

/* ═════════════════════════════════════════════════════════════════════
   4. CLASSE MirrorEngine (Motor de Espelhamento e Raiz)
   ═════════════════════════════════════════════════════════════════════ */

export class MirrorEngine {
  /**
   * Executa a varredura rigorosa da janela curta (5 a 30 giros, padrão 7)
   */
  static analyze(spins: Spin[], windowSize: number = 7): MirrorSignal | null {
    if (!spins || spins.length < 2) return null;

    const tracker = new RouletteTracker(spins);
    const janela = tracker.getJanelaCurta(windowSize);
    const numerosJanela = janela.map((s) => s.num);
    const ultimoSpin = spins[0];
    if (!ultimoSpin) return null;

    // 1. PRIORIDADE A: Detecção de Inversão Direta (Espelho Direto)
    for (const [a, b] of MAPA_INVERSOES) {
      const temA = numerosJanela.includes(a);
      const temB = numerosJanela.includes(b);

      if (temA && temB) {
        // Encontrou par de inversão direta (ex: 12 e 21, 13 e 31, 23 e 32)
        const raizA = calcularRaizDigital(a);
        const raizB = calcularRaizDigital(b);
        const somaRaiz = raizA; // Na inversão, a soma de dígitos é sempre idêntica (ex: 1+2=3 e 2+1=3)

        // Terminais faltantes da raiz (ex: para Raiz 3, saíram 12 e 21, faltam 3 e 30)
        const todosRaiz = MAPA_RAIZES[somaRaiz] || [];
        const faltantesRaiz = todosRaiz.filter((n) => !numerosJanela.slice(0, 3).includes(n));

        // Mapeamento de Mestres / Duplos
        const mestres: number[] = [];
        if (somaRaiz === 3) mestres.push(33);
        else if (somaRaiz === 4) mestres.push(22);
        else if (somaRaiz === 5) mestres.push(33, 11);
        else mestres.push(11, 22);

        const alvosPrincipais = faltantesRaiz.length > 0 ? faltantesRaiz : todosRaiz.slice(0, 2);
        const alvosMestres = Array.from(new Set(mestres.filter((m) => !alvosPrincipais.includes(m))));
        const todosAlvos = Array.from(new Set([...alvosPrincipais, ...alvosMestres]));

        // Validação de Confluência com a física da roleta e grupos
        const confluencia = this.calcularConfluencia(todosAlvos, tracker);
        const confianca = confluencia.temConfluenciaFisica ? 96 : 92;

        const tags = [
          "ESPELHO INVERSO",
          `RAIZ ${somaRaiz}`,
          `PAR ${a}⇄${b}`,
        ];
        if (alvosMestres.length > 0) tags.push(`MESTRE ${alvosMestres.join("/")}`);
        if (confluencia.temConfluenciaFisica) tags.push("CONFLUÊNCIA FÍSICA 95%+");

        return {
          id: `mirror-inv-${a}-${b}-${ultimoSpin.id}`,
          tipo: "inversao",
          raiz: somaRaiz,
          gatilhos: [a, b],
          alvosPrincipais,
          alvosMestres,
          todosAlvos,
          confianca,
          tags,
          justificativa: `Inversão direta ${a} ⇄ ${b} detectada na janela (${a} e ${b} somam raiz ${somaRaiz}). Recomendado cobrir os terminais faltantes da Raiz ${somaRaiz} (${alvosPrincipais.join(", ")}) e a exceção mestre (${alvosMestres.join(", ")}).`,
          detalheFisico: confluencia.detalhe,
          timestamp: Date.now(),
          spinTriggerId: ultimoSpin.id,
        };
      }
    }

    // 2. PRIORIDADE B: Detecção de Raiz Múltipla (2 ou mais números da mesma raiz)
    const contagemPorRaiz: Record<number, number[]> = {};
    for (let r = 1; r <= 9; r++) contagemPorRaiz[r] = [];

    numerosJanela.forEach((n) => {
      if (n !== 0) {
        const r = calcularRaizDigital(n);
        contagemPorRaiz[r]?.push(n);
      }
    });

    for (let r = 1; r <= 9; r++) {
      const ocorrencias = contagemPorRaiz[r] || [];
      const unicos = Array.from(new Set(ocorrencias));

      if (unicos.length >= 2) {
        // Encontrou 2 ou mais números distintos da mesma Raiz
        const todosRaiz = MAPA_RAIZES[r] || [];
        const faltantesRaiz = todosRaiz.filter((n) => !unicos.includes(n));

        const mestres: number[] = [];
        if (r === 1 || r === 2) mestres.push(11, 22);
        else if (r === 3 || r === 6) mestres.push(33);
        else if (r === 4) mestres.push(22);

        const alvosPrincipais = faltantesRaiz.length > 0 ? faltantesRaiz : todosRaiz.slice(0, 2);
        const alvosMestres = Array.from(new Set(mestres.filter((m) => !alvosPrincipais.includes(m))));
        const todosAlvos = Array.from(new Set([...alvosPrincipais, ...alvosMestres]));

        const confluencia = this.calcularConfluencia(todosAlvos, tracker);
        const confianca = confluencia.temConfluenciaFisica ? 95 : 91;

        const tags = [
          `RAIZ ${r} CONCENTRADA`,
          `GATILHO ${unicos.join("&")}`,
        ];
        if (alvosMestres.length > 0) tags.push(`MESTRE ${alvosMestres.join("/")}`);
        if (confluencia.temConfluenciaFisica) tags.push("CONFLUÊNCIA FÍSICA 95%+");

        return {
          id: `mirror-root-${r}-${unicos.join("-")}-${ultimoSpin.id}`,
          tipo: "raiz",
          raiz: r,
          gatilhos: unicos,
          alvosPrincipais,
          alvosMestres,
          todosAlvos,
          confianca,
          tags,
          justificativa: `Concentração da Raiz ${r} detectada (${unicos.join(", ")} na janela de ${windowSize} giros). Cobrir terminais faltantes (${alvosPrincipais.join(", ")})${alvosMestres.length > 0 ? ` e exceção mestre (${alvosMestres.join(", ")})` : ""}.`,
          detalheFisico: confluencia.detalhe,
          timestamp: Date.now(),
          spinTriggerId: ultimoSpin.id,
        };
      }
    }

    return null;
  }

  /**
   * Cruza alvos com setores quentes e proximidade física da roleta
   */
  private static calcularConfluencia(
    alvos: number[],
    tracker: RouletteTracker,
  ): { temConfluenciaFisica: boolean; detalhe: string } {
    const setores = tracker.getSetoresQuentes(15);
    const vizinhosFisicos: number[] = [];

    alvos.forEach((n) => {
      if (tracker.isVizinhoFisicoRecente(n, 3)) {
        vizinhosFisicos.push(n);
      }
    });

    const temVizinhoFisico = vizinhosFisicos.length > 0;
    const setorQuenteDominante =
      setores.voisinsRatio >= 1.25
        ? "Voisins"
        : setores.tiersRatio >= 1.25
          ? "Tiers"
          : setores.orphelinsRatio >= 1.25
            ? "Orphelins"
            : null;

    const alvosNoSetorQuente = setorQuenteDominante
      ? alvos.filter((n) => {
          if (setorQuenteDominante === "Voisins") return VOISINS.includes(n);
          if (setorQuenteDominante === "Tiers") return TIERS.includes(n);
          return ORPHELINS.includes(n);
        })
      : [];

    const temConfluenciaFisica = temVizinhoFisico || alvosNoSetorQuente.length > 0;

    const partesDetalhe: string[] = [];
    if (temVizinhoFisico) {
      partesDetalhe.push(`Alvo(s) ${vizinhosFisicos.join(", ")} no raio de vizinhos físicos do último`);
    }
    if (setorQuenteDominante && alvosNoSetorQuente.length > 0) {
      partesDetalhe.push(`Confluência no setor ${setorQuenteDominante} (${alvosNoSetorQuente.join(", ")})`);
    }
    if (partesDetalhe.length === 0) {
      partesDetalhe.push("Validação matemática pura (aguardando confluência física)");
    }

    return {
      temConfluenciaFisica,
      detalhe: partesDetalhe.join(" · "),
    };
  }
}

/* ═════════════════════════════════════════════════════════════════════
   5. CLASSE NotificationSystem (Gerenciamento de Alertas Pinned)
   ═════════════════════════════════════════════════════════════════════ */

export class NotificationSystem {
  private static dismissedSignalIds = new Set<string>();

  static isDismissed(id: string): boolean {
    return this.dismissedSignalIds.has(id);
  }

  static dismiss(id: string): void {
    this.dismissedSignalIds.add(id);
  }

  static resetDismissed(): void {
    this.dismissedSignalIds.clear();
  }

  /**
   * Processa o sinal e decide se deve renderizar e tocar áudio
   */
  static processSignal(
    signal: MirrorSignal | null,
    soundEnabled: boolean = true,
    lastPlayedIdRef?: { current: string | null },
  ): MirrorSignal | null {
    if (!signal) return null;
    if (this.isDismissed(signal.id)) return null;

    if (soundEnabled && lastPlayedIdRef && lastPlayedIdRef.current !== signal.id) {
      lastPlayedIdRef.current = signal.id;
      playNeonAlertSound();
    }

    return signal;
  }
}
