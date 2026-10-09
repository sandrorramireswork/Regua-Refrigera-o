import type { Spin } from "@/lib/roulette";
import { CILINDRO, vizinhos } from "@/lib/roulette";
import type {
  OpportunityAnalysis,
  OpportunityEvent,
  OpportunityStats,
} from "@/lib/opportunity-tracker";

export const DEALER_JUMP_COUNT = 4;
export const DEALER_JUMP_MAX_AMPLITUDE = 5;
export const ADVANCED_ENTRIES = 2;

type AlertResult = "win" | "loss" | "pending";

export interface DealerJumpSignal {
  key: "dealer-jump";
  kind: "Salto Físico";
  triggerSpinId: string;
  index: number;
  jumps: number[];
  averageJump: number;
  projectedJump: number;
  centralTarget: number;
  targets: number[];
  result: AlertResult;
  stats: OpportunityStats;
}

export interface ConfluenceTarget {
  number: number;
  patterns: string[];
}

export interface SuperConfluenceSignal {
  key: "super-confluence";
  triggerSpinId: string;
  index: number;
  patterns: string[];
  targets: number[];
  targetDetails: ConfluenceTarget[];
  result: AlertResult;
  stats: OpportunityStats;
}

export interface AdvancedAnalysis {
  activeJump: DealerJumpSignal | null;
  activeConfluence: SuperConfluenceSignal | null;
  jumpTimeline: DealerJumpSignal[];
  confluenceTimeline: SuperConfluenceSignal[];
}

function emptyStats(): OpportunityStats {
  return { wins: 0, losses: 0, total: 0, accuracy: 0 };
}

function calculateStats(results: AlertResult[]): OpportunityStats {
  const wins = results.filter((result) => result === "win").length;
  const losses = results.filter((result) => result === "loss").length;
  const total = wins + losses;
  return { wins, losses, total, accuracy: total === 0 ? 0 : (wins / total) * 100 };
}

export function clockwiseDistance(previous: number, current: number): number {
  const previousIndex = CILINDRO.indexOf(previous);
  const currentIndex = CILINDRO.indexOf(current);
  if (previousIndex < 0 || currentIndex < 0) return 0;
  return (currentIndex - previousIndex + CILINDRO.length) % CILINDRO.length;
}

function resultWithinEntries(
  chronological: Spin[],
  index: number,
  targets: readonly number[],
): AlertResult {
  const targetSet = new Set(targets);
  const available = chronological.length - index - 1;
  const end = Math.min(index + ADVANCED_ENTRIES, chronological.length - 1);
  for (let cursor = index + 1; cursor <= end; cursor += 1) {
    const spin = chronological[cursor];
    if (spin && targetSet.has(spin.num)) return "win";
  }
  return available >= ADVANCED_ENTRIES ? "loss" : "pending";
}

function buildJumpTimeline(chronological: Spin[]): DealerJumpSignal[] {
  const raw: Omit<DealerJumpSignal, "stats">[] = [];
  for (let index = DEALER_JUMP_COUNT; index < chronological.length; index += 1) {
    const jumps: number[] = [];
    for (let offset = DEALER_JUMP_COUNT - 1; offset >= 0; offset -= 1) {
      const previous = chronological[index - offset - 1];
      const current = chronological[index - offset];
      if (previous && current) jumps.push(clockwiseDistance(previous.num, current.num));
    }
    if (jumps.length !== DEALER_JUMP_COUNT) continue;
    const amplitude = Math.max(...jumps) - Math.min(...jumps);
    if (amplitude > DEALER_JUMP_MAX_AMPLITUDE) continue;
    const averageJump = jumps.reduce((sum, jump) => sum + jump, 0) / jumps.length;
    const projectedJump = Math.round(averageJump);
    const current = chronological[index];
    if (!current) continue;
    const currentIndex = CILINDRO.indexOf(current.num);
    if (currentIndex < 0) continue;
    const centralTarget = CILINDRO[(currentIndex + projectedJump) % CILINDRO.length];
    if (centralTarget === undefined) continue;
    const targets = vizinhos(centralTarget, 2);
    raw.push({
      key: "dealer-jump",
      kind: "Salto Físico",
      triggerSpinId: current.id,
      index,
      jumps,
      averageJump,
      projectedJump,
      centralTarget,
      targets,
      result: resultWithinEntries(chronological, index, targets),
    });
  }
  const stats = calculateStats(raw.map((signal) => signal.result));
  return raw.map((signal) => ({ ...signal, stats }));
}

function confluenceAtIndex(
  events: Array<OpportunityEvent | DealerJumpSignal>,
): ConfluenceTarget[] {
  const patternsByNumber = new Map<number, Set<string>>();
  for (const event of events) {
    for (const target of event.targets) {
      const patterns = patternsByNumber.get(target) ?? new Set<string>();
      patterns.add(event.kind);
      patternsByNumber.set(target, patterns);
    }
  }
  return [...patternsByNumber.entries()]
    .filter(([, patterns]) => patterns.size >= 2)
    .map(([number, patterns]) => ({ number, patterns: [...patterns] }))
    .sort((a, b) => CILINDRO.indexOf(a.number) - CILINDRO.indexOf(b.number));
}

function buildConfluenceTimeline(
  chronological: Spin[],
  opportunities: OpportunityAnalysis,
  jumpTimeline: DealerJumpSignal[],
): SuperConfluenceSignal[] {
  const byIndex = new Map<number, Array<OpportunityEvent | DealerJumpSignal>>();
  for (const event of [...opportunities.timeline, ...jumpTimeline]) {
    const bucket = byIndex.get(event.index) ?? [];
    bucket.push(event);
    byIndex.set(event.index, bucket);
  }
  const raw: Omit<SuperConfluenceSignal, "stats">[] = [];
  for (const [index, events] of byIndex) {
    if (new Set(events.map((event) => event.kind)).size < 2) continue;
    const targetDetails = confluenceAtIndex(events);
    if (targetDetails.length === 0) continue;
    const spin = chronological[index];
    if (!spin) continue;
    const targets = targetDetails.map((target) => target.number);
    raw.push({
      key: "super-confluence",
      triggerSpinId: spin.id,
      index,
      patterns: [...new Set(targetDetails.flatMap((target) => target.patterns))],
      targets,
      targetDetails,
      result: resultWithinEntries(chronological, index, targets),
    });
  }
  const stats = calculateStats(raw.map((signal) => signal.result));
  return raw.map((signal) => ({ ...signal, stats }));
}

export function analyzeAdvancedSignals(
  spins: Spin[],
  opportunities: OpportunityAnalysis,
): AdvancedAnalysis {
  const chronological = [...spins].reverse();
  const jumpTimeline = buildJumpTimeline(chronological);
  const confluenceTimeline = buildConfluenceTimeline(chronological, opportunities, jumpTimeline);
  const latestIndex = chronological.length - 1;
  return {
    activeJump: jumpTimeline.find((signal) => signal.index === latestIndex) ?? null,
    activeConfluence:
      confluenceTimeline.find((signal) => signal.index === latestIndex) ?? null,
    jumpTimeline,
    confluenceTimeline,
  };
}