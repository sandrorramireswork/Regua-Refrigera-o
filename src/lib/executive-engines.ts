import {
  CILINDRO,
  getProps,
  vizinhos,
  type PullRules,
  type SectorDef,
  type Spin,
} from "@/lib/roulette";

export const KELLY_NET_ODDS = 36;
export const RETENTION_RADIUS = 4;
export const RETENTION_WINDOW_SIZE = RETENTION_RADIUS * 2 + 1;

type Dominant = { name: string; value: string | number; count: number; probability: number };

export interface BinaryThirdsEngine {
  sampleSize: number;
  color: Dominant;
  parity: Dominant;
  half: Dominant;
  dozen: Dominant;
  column: Dominant;
}

export interface WheelGeometryEngine {
  dominantSector: Dominant;
  averagePhysicalRadius: number;
  lastDistanceFromZero: number;
}

export interface RetentionSignal {
  active: boolean;
  hits: number;
  nucleus: number;
  window: number[];
  zone5: number[];
  recentNumbers: number[];
}

export interface ZoneCluster {
  nucleus: number;
  zone5: number[];
  count: number;
  probability: number;
  zScore: number;
}

export interface MasterPullRow {
  number: number;
  absoluteFrequency: number;
  probability: number;
  confluence: string[];
  sector: string;
  zScore: number;
  displayZScore: number;
  distanceFromZero: number;
  zone5: number[];
  kelly: number;
  insideRetention: boolean;
  highPrecision: boolean;
}

export interface ExecutiveDashboardAnalysis {
  currentNumber: number | null;
  motor1Short: BinaryThirdsEngine;
  motor1Long: BinaryThirdsEngine;
  motor2: WheelGeometryEngine;
  retention: RetentionSignal | null;
  clusters: ZoneCluster[];
  topPulls: MasterPullRow[];
}

function dominant<T extends string | number>(
  values: T[],
  options: readonly T[],
  label: (value: T) => string,
): Dominant {
  const counts = new Map<T, number>(options.map((option) => [option, 0]));
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ranked = options
    .map((value) => ({ value, count: counts.get(value) ?? 0 }))
    .sort((a, b) => b.count - a.count || options.indexOf(a.value) - options.indexOf(b.value));
  const winner = ranked[0] ?? { value: options[0] ?? "—", count: 0 };
  return {
    name: label(winner.value as T),
    value: winner.value,
    count: winner.count,
    probability: values.length > 0 ? winner.count / values.length : 0,
  };
}

export function analyzeBinaryThirds(spins: Spin[], windowSize: number): BinaryThirdsEngine {
  const sample = spins.slice(0, windowSize).filter((spin) => spin.num !== 0);
  return {
    sampleSize: sample.length,
    color: dominant(sample.map((spin) => spin.props.cor), ["red", "black"], (value) => value === "red" ? "VERMELHO" : "PRETO"),
    parity: dominant(sample.map((spin) => spin.num % 2), [0, 1], (value) => value === 0 ? "PAR" : "ÍMPAR"),
    half: dominant(sample.map((spin) => spin.num <= 18 ? 1 : 2), [1, 2], (value) => value === 1 ? "BAIXO" : "ALTO"),
    dozen: dominant(sample.map((spin) => spin.props.duzia), [1, 2, 3], (value) => `${value}ª DÚZIA`),
    column: dominant(sample.map((spin) => spin.props.coluna), [1, 2, 3], (value) => `${value}ª COLUNA`),
  };
}

export function relativeDistanceFromZero(number: number): number {
  const zeroIndex = CILINDRO.indexOf(0);
  const numberIndex = CILINDRO.indexOf(number);
  if (zeroIndex < 0 || numberIndex < 0) return 0;
  const direct = Math.abs(numberIndex - zeroIndex);
  return Math.min(direct, CILINDRO.length - direct);
}

export function exactZScore(observedProbability: number, expectedProbability: number, sampleSize: number): number {
  if (sampleSize <= 0 || expectedProbability <= 0 || expectedProbability >= 1) return 0;
  const sigma = Math.sqrt((expectedProbability * (1 - expectedProbability)) / sampleSize);
  return sigma === 0 ? 0 : (observedProbability - expectedProbability) / sigma;
}

export function exactKelly(probability: number, b = KELLY_NET_ODDS): number {
  const q = 1 - probability;
  return (b * probability - q) / b;
}

export function detectSectorRetention(spins: Spin[]): RetentionSignal | null {
  const recent = spins.slice(0, 4);
  if (recent.length < 4) return null;
  const candidates = CILINDRO.map((nucleus) => {
    const window = vizinhos(nucleus, RETENTION_RADIUS);
    const set = new Set(window);
    const hits = recent.filter((spin) => set.has(spin.num)).length;
    const distanceSum = recent
      .filter((spin) => set.has(spin.num))
      .reduce((sum, spin) => {
        const a = CILINDRO.indexOf(nucleus);
        const b = CILINDRO.indexOf(spin.num);
        const direct = Math.abs(a - b);
        return sum + Math.min(direct, CILINDRO.length - direct);
      }, 0);
    return { nucleus, window, hits, distanceSum };
  }).sort((a, b) => b.hits - a.hits || a.distanceSum - b.distanceSum || CILINDRO.indexOf(a.nucleus) - CILINDRO.indexOf(b.nucleus));
  const best = candidates[0];
  if (!best) return null;
  return {
    active: best.hits >= 3,
    hits: best.hits,
    nucleus: best.nucleus,
    window: best.window,
    zone5: vizinhos(best.nucleus, 2),
    recentNumbers: recent.map((spin) => spin.num),
  };
}

export function analyzeWheelGeometry(spins: Spin[], setores: SectorDef[]): WheelGeometryEngine {
  const sample = spins.slice(0, 50);
  const sectorNames = setores.map((sector) => sector.name);
  const dominantSector = dominant(
    sample.map((spin) => getProps(spin.num, setores).setor).filter((sector) => sector !== "—"),
    sectorNames,
    (value) => String(value).toUpperCase(),
  );
  let totalDistance = 0;
  for (let index = 0; index < sample.length - 1; index += 1) {
    const current = CILINDRO.indexOf(sample[index]?.num ?? -1);
    const previous = CILINDRO.indexOf(sample[index + 1]?.num ?? -1);
    const direct = Math.abs(current - previous);
    totalDistance += Math.min(direct, CILINDRO.length - direct);
  }
  return {
    dominantSector,
    averagePhysicalRadius: sample.length > 1 ? totalDistance / (sample.length - 1) : 0,
    lastDistanceFromZero: spins[0] ? relativeDistanceFromZero(spins[0].num) : 0,
  };
}

export function analyzeZoneClusters(spins: Spin[], limit = 5): ZoneCluster[] {
  const sampleSize = spins.length;
  const expectedProbability = 5 / CILINDRO.length;
  return CILINDRO.map((nucleus) => {
    const zone5 = vizinhos(nucleus, 2);
    const set = new Set(zone5);
    const count = spins.filter((spin) => set.has(spin.num)).length;
    const probability = sampleSize > 0 ? count / sampleSize : 0;
    return {
      nucleus,
      zone5,
      count,
      probability,
      zScore: exactZScore(probability, expectedProbability, sampleSize),
    };
  }).sort((a, b) => b.count - a.count || b.zScore - a.zScore).slice(0, limit);
}

function confluenceFor(number: number, engine: BinaryThirdsEngine, setores: SectorDef[]): string[] {
  const props = getProps(number, setores);
  if (number === 0) return [];
  const labels: string[] = [];
  if (props.duzia === engine.dozen.value) labels.push("Dúzia");
  if (props.coluna === engine.column.value) labels.push("Coluna");
  if (props.cor === engine.color.value) labels.push("Cor");
  if (number % 2 === engine.parity.value) labels.push("Par/Ímpar");
  return labels;
}

function transitionsAfter(spins: Spin[], origin: number, rules: PullRules) {
  const sample = spins.slice(0, Math.max(2, rules.windowSize));
  const counts = new Map<number, number>();
  let total = 0;
  for (let index = sample.length - 1; index > 0; index -= 1) {
    if (sample[index]?.num !== origin) continue;
    const destination = sample[index - 1]?.num;
    if (destination === undefined) continue;
    counts.set(destination, (counts.get(destination) ?? 0) + 1);
    total += 1;
  }
  return [...counts.entries()]
    .map(([number, absoluteFrequency]) => ({
      number,
      absoluteFrequency,
      probability: total > 0 ? absoluteFrequency / total : 0,
    }))
    .sort((a, b) => b.absoluteFrequency - a.absoluteFrequency || a.number - b.number)
    .slice(0, 10);
}

export function analyzeExecutiveDashboard(
  spins: Spin[],
  rules: PullRules,
  setores: SectorDef[],
): ExecutiveDashboardAnalysis {
  const motor1Short = analyzeBinaryThirds(spins, 20);
  const motor1Long = analyzeBinaryThirds(spins, 50);
  const motor2 = analyzeWheelGeometry(spins, setores);
  const retention = detectSectorRetention(spins);
  const clusters = analyzeZoneClusters(spins);
  const currentNumber = spins[0]?.num ?? null;
  const totalSpins = spins.length;
  const globalCounts = new Map<number, number>();
  for (const spin of spins) globalCounts.set(spin.num, (globalCounts.get(spin.num) ?? 0) + 1);
  const retentionSet = new Set(retention?.window ?? []);
  const topPulls = currentNumber === null
    ? []
    : transitionsAfter(spins, currentNumber, rules).map((transition) => {
        const globalCount = globalCounts.get(transition.number) ?? 0;
        const observedProbability = totalSpins > 0 ? globalCount / totalSpins : 0;
        const zScore = exactZScore(observedProbability, 1 / CILINDRO.length, totalSpins);
        const kelly = exactKelly(transition.probability);
        const insideRetention = retention?.active === true && retentionSet.has(transition.number);
        return {
          ...transition,
          confluence: confluenceFor(transition.number, motor1Long, setores),
          sector: getProps(transition.number, setores).setor,
          zScore,
          displayZScore: Math.max(-3, Math.min(3, zScore)),
          distanceFromZero: relativeDistanceFromZero(transition.number),
          zone5: vizinhos(transition.number, 2),
          kelly,
          insideRetention,
          highPrecision: zScore > 1.5 && insideRetention && kelly > 0,
        };
      });
  return { currentNumber, motor1Short, motor1Long, motor2, retention, clusters, topPulls };
}