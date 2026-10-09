import { getProps } from "@/lib/roulette";

/** Ordem espacial imutável da roleta europeia, com o zero em 0°. */
export const EUROPEAN_ROTOR_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const BALLISTIC_ANGLE_STEP = 360 / EUROPEAN_ROTOR_ORDER.length;

export const STATIC_NUMBER_ANGLES = EUROPEAN_ROTOR_ORDER.map((number, index) => ({
  number,
  angle: index * BALLISTIC_ANGLE_STEP,
}));

export interface BallisticCalibration {
  ballCoefficient: number;
  rotorCoefficient: number;
  targetOffsetDegrees: number;
}

export const DEFAULT_BALLISTIC_CALIBRATION: BallisticCalibration = {
  ballCoefficient: 1,
  rotorCoefficient: 1,
  targetOffsetDegrees: 0,
};

export interface BallisticInput {
  round: number;
  ballDeltaMs: number;
  rotorDeltaMs: number;
  scatterMode: "auto" | "manual";
  manualScatter: number;
  calibration: BallisticCalibration;
}

export interface BallisticRecord {
  id: string;
  createdAt: string;
  round: number;
  ballDeltaMs: number;
  rotorDeltaMs: number;
  deltaTimeMs: number;
  angularVelocity: number;
  calculatedDropAngle: number;
  targetZoneDegrees: number;
  primaryImpactNumber: number;
  probableNumber: number;
  confidence: number;
  scatter: number;
  scatterMode: "auto" | "manual";
  terminal: number;
  dozen: string;
  column: string;
  half: string;
  color: string;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

/**
 * REGRA CENTRAL IMUTÁVEL:
 * compara abs(Zona Alvo projetada em graus - Ângulo estático de cada número)
 * e retorna obrigatoriamente o número com a diferença mais próxima de zero.
 */
export function findPrimaryImpact(targetZoneDegrees: number) {
  const target = normalizeDegrees(targetZoneDegrees);
  return STATIC_NUMBER_ANGLES.reduce((closest, candidate) => {
    const candidateDifference = Math.abs(target - candidate.angle);
    const closestDifference = Math.abs(target - closest.angle);
    return candidateDifference < closestDifference ? candidate : closest;
  });
}

function coefficientOfVariation(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean <= 0) return 1;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export function calculateDeltaConfidence(
  history: Pick<BallisticRecord, "ballDeltaMs" | "rotorDeltaMs">[],
  current: Pick<BallisticInput, "ballDeltaMs" | "rotorDeltaMs">,
) {
  const sample = [current, ...history].slice(0, 3);
  if (sample.length < 3) return 0;
  const ballVariation = coefficientOfVariation(sample.map((item) => item.ballDeltaMs));
  const rotorVariation = coefficientOfVariation(sample.map((item) => item.rotorDeltaMs));
  return Math.max(0, Math.min(100, 100 - ((ballVariation + rotorVariation) / 2) * 100));
}

export function automaticScatter(confidence: number) {
  return Math.max(9, Math.min(15, Math.round(15 - (confidence / 100) * 6)));
}

function describeNumber(number: number) {
  const props = getProps(number);
  return {
    terminal: number % 10,
    dozen: props.duzia === 0 ? "Zero" : `${props.duzia}ª`,
    column: props.coluna === 0 ? "Zero" : `${props.coluna}ª`,
    half: number === 0 ? "Zero" : number <= 18 ? "Baixa 1-18" : "Alta 19-36",
    color: props.nomeCor.charAt(0) + props.nomeCor.slice(1).toLowerCase(),
  };
}

export function calculateBallisticRecord(
  input: BallisticInput,
  history: BallisticRecord[],
): BallisticRecord {
  const deltaTimeMs = input.ballDeltaMs - input.rotorDeltaMs;
  const ballVelocity = input.ballDeltaMs > 0 ? 360_000 / input.ballDeltaMs : 0;
  const rotorVelocity = input.rotorDeltaMs > 0 ? 360_000 / input.rotorDeltaMs : 0;
  const angularVelocity = Math.abs(ballVelocity - rotorVelocity);
  const calculatedDropAngle =
    ((input.ballDeltaMs * input.calibration.ballCoefficient -
      input.rotorDeltaMs * input.calibration.rotorCoefficient) /
      1000) *
    360;
  const targetZoneDegrees = normalizeDegrees(
    calculatedDropAngle + input.calibration.targetOffsetDegrees,
  );
  const primaryImpact = findPrimaryImpact(targetZoneDegrees);
  const confidence = calculateDeltaConfidence(history, input);
  const scatter =
    input.scatterMode === "auto"
      ? automaticScatter(confidence)
      : Math.max(9, Math.min(15, Math.round(input.manualScatter)));
  const impactIndex = EUROPEAN_ROTOR_ORDER.indexOf(primaryImpact.number);
  const probableNumber = EUROPEAN_ROTOR_ORDER[(impactIndex + scatter) % EUROPEAN_ROTOR_ORDER.length];
  const safeProbableNumber = probableNumber ?? primaryImpact.number;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    round: input.round,
    ballDeltaMs: input.ballDeltaMs,
    rotorDeltaMs: input.rotorDeltaMs,
    deltaTimeMs,
    angularVelocity,
    calculatedDropAngle,
    targetZoneDegrees,
    primaryImpactNumber: primaryImpact.number,
    probableNumber: safeProbableNumber,
    confidence,
    scatter,
    scatterMode: input.scatterMode,
    ...describeNumber(safeProbableNumber),
  };
}