// Core Thermodynamics Engine (100% Offline Analytical Formulas)
// Uses the Antoine Equation: log10(P) = A - B / (T + C)
// where P is Absolute Pressure in bar, and T is Temperature in °C.

interface ReferencePoints {
  t1: number; p1: number;
  t2: number; p2: number;
  t3: number; p3: number;
}

interface AntoineCoeffs {
  A: number;
  B: number;
  C: number;
}

// Known saturation points (T in °C, P in bar absolute) for high-accuracy HVAC range (-40°C to +60°C)
const refPoints: Record<string, ReferencePoints> = {
  "R-410A": { t1: -20, p1: 3.996, t2: 10, p2: 10.86, t3: 40, p3: 24.20 },
  "R-32": { t1: -20, p1: 4.25, t2: 10, p2: 11.07, t3: 40, p3: 24.78 },
  "R-134a": { t1: -20, p1: 1.327, t2: 10, p2: 4.146, t3: 40, p3: 10.165 },
  "R-404A": { t1: -20, p1: 3.008, t2: 10, p2: 8.246, t3: 40, p3: 18.42 },
  "R-22": { t1: -20, p1: 2.448, t2: 10, p2: 6.807, t3: 40, p3: 15.335 },
  "R-407C": { t1: -20, p1: 2.45, t2: 10, p2: 7.35, t3: 40, p3: 17.50 }, // Bubble points
  "R-290": { t1: -20, p1: 2.44, t2: 10, p2: 6.36, t3: 40, p3: 13.67 },
  "R-1234yf": { t1: -20, p1: 1.43, t2: 10, p2: 4.35, t3: 40, p3: 10.15 },
  "R-744": { t1: -40, p1: 10.05, t2: -10, p2: 26.49, t3: 20, p3: 57.29 },
};

const coefficientsCache: Record<string, AntoineCoeffs> = {};

/**
 * Derives the Antoine coefficients (A, B, C) analytically by solving the system of 3 equations
 * passing exactly through the 3 reference points.
 */
function deriveAntoine(refId: string): AntoineCoeffs {
  if (coefficientsCache[refId]) return coefficientsCache[refId];

  const pts = refPoints[refId];
  if (!pts) throw new Error(`Refrigerant ${refId} not supported.`);

  const y1 = Math.log10(pts.p1);
  const y2 = Math.log10(pts.p2);
  const y3 = Math.log10(pts.p3);

  const K = ((y1 - y2) / (y2 - y3)) * ((pts.t2 - pts.t3) / (pts.t1 - pts.t2));
  const C = (pts.t3 - K * pts.t1) / (K - 1);
  const B = ((y1 - y2) * (pts.t1 + C) * (pts.t2 + C)) / (pts.t1 - pts.t2);
  const A = y1 + B / (pts.t1 + C);

  const coeffs = { A, B, C };
  coefficientsCache[refId] = coeffs;
  return coeffs;
}

/**
 * Computes Saturation Temperature (°C) given Absolute Pressure (bar)
 */
export function getSaturationTemp(refId: string, pressureBarAbs: number): number {
  if (pressureBarAbs <= 0.01) return -100; // prevent log errors
  const { A, B, C } = deriveAntoine(refId);
  const logP = Math.log10(pressureBarAbs);
  // log10(P) = A - B / (T + C)  =>  T + C = B / (A - log10(P))
  const T = (B / (A - logP)) - C;
  return T;
}

/**
 * Computes Absolute Saturation Pressure (bar) given Temperature (°C)
 */
export function getSaturationPressure(refId: string, tempC: number): number {
  const { A, B, C } = deriveAntoine(refId);
  // P = 10^(A - B / (T + C))
  const exponent = A - (B / (tempC + C));
  return Math.pow(10, exponent);
}
