import type { Spin } from "@/lib/roulette";

export const FIXED_ATTRACTIONS = [
  { trigger: 7, target: 21, probability: 66.6 },
  { trigger: 9, target: 25, probability: 40 },
  { trigger: 26, target: 33, probability: 40 },
  { trigger: 34, target: 35, probability: 40 },
] as const;

export const DYNAMIC_TRIGGERS = [22, 18] as const;
export const ATTRACTION_TRIGGERS = [7, 9, 26, 34, 22, 18] as const;

export const RETURN_CYCLES = [
  { number: 0, averageRounds: 13.5 },
  { number: 25, averageRounds: 14.6 },
  { number: 21, averageRounds: 16.6 },
] as const;

export interface AttractionSignal {
  trigger: number;
  target: number | null;
  probability: number | null;
  observations: number;
  source: "fixed" | "live";
  triggerSpinId: string;
}

export function calculateLiveAttraction(spins: Spin[], trigger: number) {
  const chronological = [...spins].reverse();
  const successors = new Map<number, { count: number; latestIndex: number }>();
  let observations = 0;

  for (let index = 0; index < chronological.length - 1; index += 1) {
    if (chronological[index]?.num !== trigger) continue;
    const target = chronological[index + 1]?.num;
    if (target === undefined) continue;
    observations += 1;
    const current = successors.get(target);
    successors.set(target, {
      count: (current?.count ?? 0) + 1,
      latestIndex: index,
    });
  }

  const leading = [...successors.entries()].sort(
    (a, b) => b[1].count - a[1].count || b[1].latestIndex - a[1].latestIndex || a[0] - b[0],
  )[0];

  if (!leading || observations === 0) {
    return { target: null, probability: null, observations: 0 };
  }

  return {
    target: leading[0],
    probability: (leading[1].count / observations) * 100,
    observations,
  };
}

export function analyzeAttractionSignal(spins: Spin[]): AttractionSignal | null {
  const latest = spins[0];
  if (!latest || !ATTRACTION_TRIGGERS.includes(latest.num as (typeof ATTRACTION_TRIGGERS)[number])) {
    return null;
  }

  const fixed = FIXED_ATTRACTIONS.find((item) => item.trigger === latest.num);
  if (fixed) {
    return {
      trigger: fixed.trigger,
      target: fixed.target,
      probability: fixed.probability,
      observations: 0,
      source: "fixed",
      triggerSpinId: latest.id,
    };
  }

  const live = calculateLiveAttraction(spins, latest.num);
  return {
    trigger: latest.num,
    target: live.target,
    probability: live.probability,
    observations: live.observations,
    source: "live",
    triggerSpinId: latest.id,
  };
}