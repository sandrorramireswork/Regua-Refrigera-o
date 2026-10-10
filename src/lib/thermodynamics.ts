// Core Thermodynamics Engine (100% Offline Analytical Formulas)
// Uses the Antoine Equation: log10(P) = A - B / (T + C)
// where P is Absolute Pressure in bar, and T is Temperature in °C.

export const refrigerantsList = [
  { id: "R-410A", name: "R-410A", hasGlide: true, glideK: 0.1, color: "bg-rose-500", chemName: "Mistura (R-32 / R-125)", chemFormula: "CH2F2 / CHF2CF3" },
  { id: "R-32", name: "R-32", hasGlide: false, glideK: 0, color: "bg-orange-500", chemName: "Difluorometano", chemFormula: "CH2F2" },
  { id: "R-134a", name: "R-134a", hasGlide: false, glideK: 0, color: "bg-blue-400", chemName: "Tetrafluoroetano", chemFormula: "CH2FCF3" },
  { id: "R-404A", name: "R-404A", hasGlide: true, glideK: 0.5, color: "bg-orange-600", chemName: "Mistura (R-125/143a/134a)", chemFormula: "Blend HFC" },
  { id: "R-22", name: "R-22", hasGlide: false, glideK: 0, color: "bg-green-500", chemName: "Clorodifluorometano", chemFormula: "CHClF2" },
  { id: "R-407C", name: "R-407C", hasGlide: true, glideK: 5.0, color: "bg-orange-400", chemName: "Mistura (R-32/125/134a)", chemFormula: "Blend HFC" },
  { id: "R-290", name: "R-290 (Propano)", hasGlide: false, glideK: 0, color: "bg-zinc-300", chemName: "Propano", chemFormula: "C3H8" },
  { id: "R-1234yf", name: "R-1234yf", hasGlide: false, glideK: 0, color: "bg-zinc-400", chemName: "Tetrafluoropropeno", chemFormula: "C3H2F4" },
  { id: "R-744", name: "R-744 (CO2)", hasGlide: false, glideK: 0, color: "bg-slate-500", chemName: "Dióxido de Carbono", chemFormula: "CO2" },
  { id: "R-507A", name: "R-507A", hasGlide: false, glideK: 0, color: "bg-red-500", chemName: "Mistura (R-125/143a)", chemFormula: "Blend HFC" },
  { id: "R-600a", name: "R-600a (Isobutano)", hasGlide: false, glideK: 0, color: "bg-slate-300", chemName: "Isobutano", chemFormula: "C4H10" },
  { id: "R-448A", name: "R-448A", hasGlide: true, glideK: 3.5, color: "bg-indigo-400", chemName: "Mistura Zeotrópica HFO/HFC", chemFormula: "Blend HFO" },
  { id: "R-449A", name: "R-449A", hasGlide: true, glideK: 4.0, color: "bg-indigo-500", chemName: "Mistura Zeotrópica HFO/HFC", chemFormula: "Blend HFO" },
  { id: "R-12", name: "R-12", hasGlide: false, glideK: 0, color: "bg-neutral-100", chemName: "Diclorodifluorometano", chemFormula: "CCl2F2" },
  { id: "R-502", name: "R-502", hasGlide: false, glideK: 0, color: "bg-purple-600", chemName: "Mistura (R-22 / R-115)", chemFormula: "Blend CFC/HCFC" },
  { id: "R-123", name: "R-123", hasGlide: false, glideK: 0, color: "bg-teal-300", chemName: "Diclorotrifluoroetano", chemFormula: "C2HCl2F3" },
  { id: "R-407A", name: "R-407A", hasGlide: true, glideK: 4.5, color: "bg-orange-300", chemName: "Mistura Zeotrópica", chemFormula: "Blend HFC" },
  { id: "R-407F", name: "R-407F", hasGlide: true, glideK: 4.8, color: "bg-orange-500", chemName: "Mistura Zeotrópica", chemFormula: "Blend HFC" },
];
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
  "R-507A": { t1: -20, p1: 3.12, t2: 10, p2: 8.48, t3: 40, p3: 18.82 },
  "R-600a": { t1: -20, p1: 0.69, t2: 10, p2: 2.23, t3: 40, p3: 5.31 },
  "R-448A": { t1: -20, p1: 2.40, t2: 10, p2: 7.00, t3: 40, p3: 15.60 },
  "R-449A": { t1: -20, p1: 2.38, t2: 10, p2: 6.95, t3: 40, p3: 15.45 },
  "R-12": { t1: -20, p1: 1.51, t2: 10, p2: 4.23, t3: 40, p3: 9.60 },
  "R-502": { t1: -20, p1: 2.50, t2: 10, p2: 6.84, t3: 40, p3: 15.43 },
  "R-123": { t1: -20, p1: 0.12, t2: 10, p2: 0.44, t3: 40, p3: 1.55 },
  "R-407A": { t1: -20, p1: 2.25, t2: 10, p2: 6.70, t3: 40, p3: 15.90 },
  "R-407F": { t1: -20, p1: 2.45, t2: 10, p2: 7.30, t3: 40, p3: 17.00 }
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
