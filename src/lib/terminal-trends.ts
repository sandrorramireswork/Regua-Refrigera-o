import type { Spin } from "@/lib/roulette";

export const TERMINALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const TERMINAL_ROLLING_WINDOW = 20;

export interface TerminalSnapshot {
  round: number;
  [terminal: `T${number}`]: number;
}

export interface TerminalTemperature {
  terminal: number;
  count: number;
  frequency: number;
  expectedFrequency: number;
  deviation: number;
  state: "QUENTE" | "FRIO" | "NEUTRO";
}

function expectedTerminalFrequency(terminal: number): number {
  let outcomes = 0;
  for (let number = 0; number <= 36; number += 1) {
    if (number % 10 === terminal) outcomes += 1;
  }
  return outcomes / 37;
}

export function analyzeTerminalTrends(
  spins: Spin[],
  rollingWindow = TERMINAL_ROLLING_WINDOW,
  maxRounds = 50,
): { snapshots: TerminalSnapshot[]; temperatures: TerminalTemperature[]; sampleSize: number } {
  const chronological = [...spins].reverse();
  const visible = chronological.slice(-maxRounds);
  const offset = chronological.length - visible.length;
  const snapshots = visible.map((_, index) => {
    const end = index + 1;
    const start = Math.max(0, end - rollingWindow);
    const window = visible.slice(start, end);
    const snapshot = { round: offset + end } as TerminalSnapshot;
    for (const terminal of TERMINALS) {
      const count = window.filter((spin) => spin.num % 10 === terminal).length;
      snapshot[`T${terminal}`] = count / window.length;
    }
    return snapshot;
  });

  const currentWindow = spins.slice(0, rollingWindow);
  const temperatures = TERMINALS.map((terminal) => {
    const count = currentWindow.filter((spin) => spin.num % 10 === terminal).length;
    const frequency = currentWindow.length > 0 ? count / currentWindow.length : 0;
    const expectedFrequency = expectedTerminalFrequency(terminal);
    const deviation = frequency - expectedFrequency;
    return {
      terminal,
      count,
      frequency,
      expectedFrequency,
      deviation,
      state: deviation > 0 ? "QUENTE" as const : deviation < 0 ? "FRIO" as const : "NEUTRO" as const,
    };
  });

  return { snapshots, temperatures, sampleSize: currentWindow.length };
}