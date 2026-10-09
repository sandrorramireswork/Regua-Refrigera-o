import { vizinhos, type Spin } from "@/lib/roulette";

export const SUBTRACTION_NEIGHBOR_RADIUS = 4;

export interface SubtractionTarget {
  number: number;
  zone: number[];
}

export interface SubtractionStrategySignal {
  triggerSpinId: string;
  highNumber: number;
  lowNumber: number;
  difference: number;
  terminal: number;
  lowerTarget: SubtractionTarget;
  upperTarget: SubtractionTarget;
}

function terminalNumbers(terminal: number): number[] {
  const numbers: number[] = [];
  for (let number = 1; number <= 36; number += 1) {
    if (number % 10 === terminal) numbers.push(number);
  }
  return numbers;
}

/**
 * O histórico usa index 0 como giro mais recente. O gatilho só existe quando
 * os dois últimos giros consecutivos são Alto (19–36) seguido de Baixo (1–18).
 * O zero nunca participa e, por exigir consecutividade, cancela a sequência.
 */
export function analyzeSubtractionStrategy(
  spins: Spin[],
): SubtractionStrategySignal | null {
  const lowSpin = spins[0];
  const highSpin = spins[1];
  if (!lowSpin || !highSpin) return null;
  if (highSpin.num < 19 || highSpin.num > 36) return null;
  if (lowSpin.num < 1 || lowSpin.num > 18) return null;

  const difference = highSpin.num - lowSpin.num;
  const terminal = difference % 10;
  const candidates = terminalNumbers(terminal);
  const lowerNumber = candidates[0];
  const upperNumber = candidates[candidates.length - 1];
  if (lowerNumber === undefined || upperNumber === undefined) return null;

  return {
    triggerSpinId: lowSpin.id,
    highNumber: highSpin.num,
    lowNumber: lowSpin.num,
    difference,
    terminal,
    lowerTarget: {
      number: lowerNumber,
      zone: vizinhos(lowerNumber, SUBTRACTION_NEIGHBOR_RADIUS),
    },
    upperTarget: {
      number: upperNumber,
      zone: vizinhos(upperNumber, SUBTRACTION_NEIGHBOR_RADIUS),
    },
  };
}