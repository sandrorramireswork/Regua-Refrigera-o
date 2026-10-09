import type { Spin } from "@/lib/roulette";

export const OPPORTUNITY_WINDOW = 15;
export const OPPORTUNITY_ENTRIES = 2;

export const PULL_TARGETS: Readonly<Record<number, readonly number[]>> = {
  12: [19, 4, 21, 2, 25],
  23: [26, 0, 32, 15, 19],
  31: [6, 27, 13, 36, 11],
  30: [12, 35, 3, 26, 0],
  36: [9, 22, 18, 29, 7],
  17: [33, 1, 20, 14, 31],
  11: [31, 9, 22, 18, 29, 24, 16, 33, 1, 20],
  0: [11, 30, 8, 23, 10],
  26: [8, 23, 10, 5, 24],
};

export type OpportunityKind = "Puxada" | "Terminal" | "Quebra de Dúzia" | "Quebra de Coluna";

export interface OpportunityStats {
  wins: number;
  losses: number;
  total: number;
  accuracy: number;
}

export interface OpportunitySignal {
  key: string;
  kind: OpportunityKind;
  trigger: number;
  terminal: number | null;
  targets: number[];
  targetLabel: string;
  triggerSpinId: string;
  stats: OpportunityStats;
}

export interface OpportunityAnalysis {
  active: OpportunitySignal[];
  stats: Record<string, OpportunityStats>;
  timeline: OpportunityEvent[];
}

export interface OpportunityEvent extends OpportunitySignal {
  index: number;
  result: "win" | "loss" | "pending";
}

interface Occurrence {
  key: string;
  kind: OpportunityKind;
  trigger: number;
  terminal: number | null;
  targets: number[];
  targetLabel: string;
  triggerSpinId: string;
  index: number;
}

interface AlertOccurrence extends Occurrence {
  result: "win" | "loss" | "pending";
}

function terminalTargets(terminal: number): number[] {
  return Array.from({ length: 37 }, (_, number) => number).filter(
    (number) => number % 10 === terminal,
  );
}

function dozenTargets(repeatedDozen: number): number[] {
  return [
    0,
    ...Array.from({ length: 36 }, (_, index) => index + 1).filter(
      (number) => Math.ceil(number / 12) !== repeatedDozen,
    ),
  ];
}

function columnTargets(repeatedColumn: number): number[] {
  return [
    0,
    ...Array.from({ length: 36 }, (_, index) => index + 1).filter((number) => {
      const column = number % 3 === 0 ? 3 : number % 3;
      return column !== repeatedColumn;
    }),
  ];
}

function patternsForSpin(spin: Spin, index: number): Occurrence[] {
  const terminal = spin.num % 10;
  const patterns: Occurrence[] = [
    {
      key: `terminal:${terminal}`,
      kind: "Terminal",
      trigger: spin.num,
      terminal,
      targets: terminalTargets(terminal),
      targetLabel: terminalTargets(terminal).join(", "),
      triggerSpinId: spin.id,
      index,
    },
  ];
  const pullTargets = PULL_TARGETS[spin.num];
  if (pullTargets) {
    patterns.unshift({
      key: `pull:${spin.num}`,
      kind: "Puxada",
      trigger: spin.num,
      terminal: null,
      targets: [...pullTargets],
      targetLabel: pullTargets.join(", "),
      triggerSpinId: spin.id,
      index,
    });
  }
  return patterns;
}

function breakPatternsForSpin(chronological: Spin[], index: number): Occurrence[] {
  if (index < 2) return [];
  const current = chronological[index];
  const previous = chronological[index - 1];
  const beforePrevious = chronological[index - 2];
  if (!current || !previous || !beforePrevious) return [];

  const patterns: Occurrence[] = [];
  const dozen = current.props.duzia;
  const previousRunDozen = chronological[index - 3]?.props.duzia;
  if (
    dozen > 0 &&
    previous.props.duzia === dozen &&
    beforePrevious.props.duzia === dozen &&
    previousRunDozen !== dozen
  ) {
    const targets = dozenTargets(dozen);
    const otherDozens = [1, 2, 3].filter((value) => value !== dozen);
    patterns.push({
      key: `dozen-break:${dozen}`,
      kind: "Quebra de Dúzia",
      trigger: current.num,
      terminal: null,
      targets,
      targetLabel: `Dúzias ${otherDozens.join(" e ")} + Zero`,
      triggerSpinId: current.id,
      index,
    });
  }

  const column = current.props.coluna;
  const previousRunColumn = chronological[index - 3]?.props.coluna;
  if (
    column > 0 &&
    previous.props.coluna === column &&
    beforePrevious.props.coluna === column &&
    previousRunColumn !== column
  ) {
    const targets = columnTargets(column);
    const otherColumns = [1, 2, 3].filter((value) => value !== column);
    patterns.push({
      key: `column-break:${column}`,
      kind: "Quebra de Coluna",
      trigger: current.num,
      terminal: null,
      targets,
      targetLabel: `Colunas ${otherColumns.join(" e ")} + Zero`,
      triggerSpinId: current.id,
      index,
    });
  }
  return patterns;
}

function hitWithinEntries(
  chronological: Spin[],
  occurrence: Occurrence,
  knownThroughIndex: number,
): boolean {
  const targetSet = new Set(occurrence.targets);
  const end = Math.min(
    occurrence.index + OPPORTUNITY_ENTRIES,
    knownThroughIndex,
    chronological.length - 1,
  );
  for (let index = occurrence.index + 1; index <= end; index += 1) {
    const spin = chronological[index];
    if (spin && targetSet.has(spin.num)) return true;
  }
  return false;
}

function alertResult(chronological: Spin[], occurrence: Occurrence): AlertOccurrence["result"] {
  if (hitWithinEntries(chronological, occurrence, chronological.length - 1)) return "win";
  return chronological.length - occurrence.index - 1 >= OPPORTUNITY_ENTRIES ? "loss" : "pending";
}

export function analyzeOpportunities(spins: Spin[]): OpportunityAnalysis {
  const chronological = [...spins].reverse();
  const occurrencesByKey = new Map<string, Occurrence[]>();
  const alerts: AlertOccurrence[] = [];

  chronological.forEach((spin, index) => {
    for (const occurrence of patternsForSpin(spin, index)) {
      const priorOccurrences = occurrencesByKey.get(occurrence.key) ?? [];
      const windowStart = Math.max(0, index - OPPORTUNITY_WINDOW);
      const previouslyValidated = priorOccurrences.some(
        (prior) =>
          prior.index >= windowStart &&
          hitWithinEntries(chronological, prior, index),
      );

      if (previouslyValidated) {
        alerts.push({
          ...occurrence,
          result: alertResult(chronological, occurrence),
        });
      }
      occurrencesByKey.set(occurrence.key, [...priorOccurrences, occurrence]);
    }
    for (const occurrence of breakPatternsForSpin(chronological, index)) {
      alerts.push({
        ...occurrence,
        result: alertResult(chronological, occurrence),
      });
    }
  });

  const stats: Record<string, OpportunityStats> = {};
  for (const alert of alerts) {
    if (alert.result === "pending") continue;
    const current = stats[alert.key] ?? { wins: 0, losses: 0, total: 0, accuracy: 0 };
    const wins = current.wins + (alert.result === "win" ? 1 : 0);
    const losses = current.losses + (alert.result === "loss" ? 1 : 0);
    const total = wins + losses;
    stats[alert.key] = { wins, losses, total, accuracy: (wins / total) * 100 };
  }

  const latestIndex = chronological.length - 1;
  const active = alerts
    .filter((alert) => alert.index === latestIndex)
    .map(({ result: _result, index: _index, ...alert }) => ({
      ...alert,
      stats: stats[alert.key] ?? { wins: 0, losses: 0, total: 0, accuracy: 0 },
    }));

  const timeline = alerts.map((alert) => ({
    ...alert,
    stats: stats[alert.key] ?? { wins: 0, losses: 0, total: 0, accuracy: 0 },
  }));

  return { active, stats, timeline };
}