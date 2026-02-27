export type DimensionBand =
  | "fixed-point"
  | "limit-cycle"
  | "torus"
  | "fractal"
  | "diffusive"
  | "undetermined";

export type CorrelationDimensionOptions = {
  embeddingDimension?: number;
  minPoints?: number;
  maxPoints?: number;
  minPairs?: number;
  radiusCount?: number;
  lowerQuantile?: number;
  upperQuantile?: number;
  theilerWindow?: number;
};

export type CorrelationDimensionResult = {
  dimension: number;
  slope: number;
  rSquared: number;
  sampleCount: number;
  pairCount: number;
  minRadius: number;
  maxRadius: number;
  radii: number[];
  correlations: number[];
};

export type DimensionBandOptions = {
  embeddingDimension?: number;
  fixedThreshold?: number;
  cycleThreshold?: number;
  torusTolerance?: number;
  diffusiveTolerance?: number;
  integerTolerance?: number;
};

const DEFAULT_MIN_POINTS = 24;
const DEFAULT_MAX_POINTS = 120;
const DEFAULT_MIN_PAIRS = 120;
const DEFAULT_RADIUS_COUNT = 10;
const DEFAULT_LOWER_Q = 0.02;
const DEFAULT_UPPER_Q = 0.35;
const DEFAULT_THEILER_WINDOW = 1;

export function estimateCorrelationDimension(
  trajectory: Float64Array,
  options: CorrelationDimensionOptions = {},
): CorrelationDimensionResult | null {
  const embeddingDimension = Math.max(1, Math.floor(options.embeddingDimension ?? 3));
  const minPoints = Math.max(8, Math.floor(options.minPoints ?? DEFAULT_MIN_POINTS));
  const maxPoints = Math.max(minPoints, Math.floor(options.maxPoints ?? DEFAULT_MAX_POINTS));
  const minPairs = Math.max(32, Math.floor(options.minPairs ?? DEFAULT_MIN_PAIRS));
  const radiusCount = Math.max(4, Math.floor(options.radiusCount ?? DEFAULT_RADIUS_COUNT));
  const theilerWindow = Math.max(0, Math.floor(options.theilerWindow ?? DEFAULT_THEILER_WINDOW));
  const lowerQ = clamp(options.lowerQuantile ?? DEFAULT_LOWER_Q, 0.01, 0.45);
  const upperQ = clamp(options.upperQuantile ?? DEFAULT_UPPER_Q, lowerQ + 0.05, 0.99);

  const points = samplePoints(trajectory, embeddingDimension, maxPoints);
  const sampleCount = Math.floor(points.length / embeddingDimension);
  if (sampleCount < minPoints) return null;

  const distances = pairwiseDistances(points, embeddingDimension, theilerWindow);
  if (distances.length < minPairs) return null;
  distances.sort((a, b) => a - b);

  const minRadius = quantile(distances, lowerQ);
  const maxRadius = quantile(distances, upperQ);
  if (!isFiniteNumber(minRadius) || !isFiniteNumber(maxRadius)) return null;
  if (minRadius <= 0 || maxRadius <= minRadius * 1.01) return null;

  const radii = logSpace(minRadius, maxRadius, radiusCount);
  const curve = correlationCurve(distances, radii);
  if (curve.logRadii.length < 3) return null;

  const fit = linearRegression(curve.logRadii, curve.logCorr);
  const localSlope = robustLocalSlope(curve.logRadii, curve.logCorr);
  const corrSlope = Number.isFinite(localSlope) ? localSlope : fit.slope;
  const twoNNSlope = estimateTwoNNDimension(points, embeddingDimension, theilerWindow);
  const slope = blendDimension(corrSlope, twoNNSlope, embeddingDimension);
  const dimension = clamp(slope, 0, embeddingDimension);

  return {
    dimension,
    slope,
    rSquared: fit.rSquared,
    sampleCount,
    pairCount: distances.length,
    minRadius,
    maxRadius,
    radii: radii.slice(0, curve.correlations.length),
    correlations: curve.correlations,
  };
}

export function classifyDimensionBand(
  dimension: number | null | undefined,
  options: DimensionBandOptions = {},
): DimensionBand {
  if (!isFiniteNumber(dimension)) return "undetermined";
  const d = dimension as number;
  const embeddingDimension = Math.max(2, Math.floor(options.embeddingDimension ?? 3));
  const fixedThreshold = options.fixedThreshold ?? 0.35;
  const cycleThreshold = options.cycleThreshold ?? 1.2;
  const torusTolerance = options.torusTolerance ?? 0.28;
  const diffusiveTolerance = options.diffusiveTolerance ?? 0.9;
  const integerTolerance = options.integerTolerance ?? 0.12;

  if (d <= fixedThreshold) return "fixed-point";
  if (d <= cycleThreshold) return "limit-cycle";
  if (Math.abs(d - 2) <= torusTolerance) return "torus";
  if (d >= embeddingDimension - diffusiveTolerance) return "diffusive";

  const nearestInteger = Math.round(d);
  if (Math.abs(d - nearestInteger) > integerTolerance) return "fractal";
  return d < 2 ? "fractal" : "torus";
}

function samplePoints(
  trajectory: Float64Array,
  embeddingDimension: number,
  maxPoints: number,
): number[] {
  const totalPoints = Math.floor(trajectory.length / embeddingDimension);
  if (totalPoints <= 0) return [];

  const target = Math.max(1, Math.min(maxPoints, totalPoints));
  const sampled: number[] = [];
  for (let i = 0; i < target; i++) {
    const t = target <= 1 ? 0 : i / (target - 1);
    const index = Math.max(0, Math.min(totalPoints - 1, Math.round(t * (totalPoints - 1))));
    const base = index * embeddingDimension;
    for (let k = 0; k < embeddingDimension; k++) sampled.push(trajectory[base + k] ?? 0);
  }
  return sampled;
}

function pairwiseDistances(
  points: number[],
  embeddingDimension: number,
  theilerWindow: number,
): number[] {
  const count = Math.floor(points.length / embeddingDimension);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const baseI = i * embeddingDimension;
    for (let j = i + 1; j < count; j++) {
      if (j - i <= theilerWindow) continue;
      const baseJ = j * embeddingDimension;
      let sq = 0;
      for (let k = 0; k < embeddingDimension; k++) {
        const d = points[baseI + k] - points[baseJ + k];
        sq += d * d;
      }
      if (sq > 0 && Number.isFinite(sq)) out.push(Math.sqrt(sq));
    }
  }
  return out;
}

function logSpace(minValue: number, maxValue: number, count: number): number[] {
  const out: number[] = [];
  const lo = Math.log(minValue);
  const hi = Math.log(maxValue);
  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0 : i / (count - 1);
    out.push(Math.exp(lo + t * (hi - lo)));
  }
  return out;
}

function correlationCurve(
  sortedDistances: number[],
  radii: number[],
): { logRadii: number[]; logCorr: number[]; correlations: number[] } {
  const pairCount = sortedDistances.length;
  const logRadii: number[] = [];
  const logCorr: number[] = [];
  const correlations: number[] = [];
  let cursor = 0;
  for (let i = 0; i < radii.length; i++) {
    const r = radii[i];
    while (cursor < pairCount && sortedDistances[cursor] <= r) cursor++;
    const c = cursor / pairCount;
    if (c <= 0 || c >= 1) continue;
    logRadii.push(Math.log(r));
    logCorr.push(Math.log(c));
    correlations.push(c);
  }
  return { logRadii, logCorr, correlations };
}

function robustLocalSlope(logRadii: number[], logCorr: number[]): number {
  const n = Math.min(logRadii.length, logCorr.length);
  if (n < 3) return NaN;

  const slopes: number[] = [];
  for (let i = 1; i < n; i++) {
    const dx = logRadii[i] - logRadii[i - 1];
    if (!Number.isFinite(dx) || Math.abs(dx) <= 1e-12) continue;
    const slope = (logCorr[i] - logCorr[i - 1]) / dx;
    if (Number.isFinite(slope) && slope > 0) slopes.push(slope);
  }
  if (slopes.length < 2) return NaN;

  slopes.sort((a, b) => a - b);
  const lo = Math.floor(0.2 * (slopes.length - 1));
  const hi = Math.max(lo, Math.ceil(0.8 * (slopes.length - 1)));
  const trimmed = slopes.slice(lo, hi + 1);
  if (!trimmed.length) return NaN;

  const mid = Math.floor(trimmed.length / 2);
  return trimmed.length % 2 === 1
    ? trimmed[mid]
    : 0.5 * (trimmed[mid - 1] + trimmed[mid]);
}

function estimateTwoNNDimension(
  points: number[],
  embeddingDimension: number,
  theilerWindow: number,
): number {
  const count = Math.floor(points.length / embeddingDimension);
  if (count < 5) return NaN;

  const logs: number[] = [];
  for (let i = 0; i < count; i++) {
    const baseI = i * embeddingDimension;
    let r1 = Number.POSITIVE_INFINITY;
    let r2 = Number.POSITIVE_INFINITY;
    for (let j = 0; j < count; j++) {
      if (i === j) continue;
      if (Math.abs(i - j) <= theilerWindow) continue;
      const baseJ = j * embeddingDimension;
      let sq = 0;
      for (let k = 0; k < embeddingDimension; k++) {
        const d = points[baseI + k] - points[baseJ + k];
        sq += d * d;
      }
      if (!Number.isFinite(sq) || sq <= 0) continue;
      const dist = Math.sqrt(sq);
      if (dist < r1) {
        r2 = r1;
        r1 = dist;
      } else if (dist < r2) {
        r2 = dist;
      }
    }
    if (!Number.isFinite(r1) || !Number.isFinite(r2) || r1 <= 0 || r2 <= r1) continue;
    const ratio = r2 / r1;
    if (ratio > 1) logs.push(Math.log(ratio));
  }
  if (!logs.length) return NaN;
  const avg = mean(logs);
  if (!Number.isFinite(avg) || avg <= 1e-12) return NaN;
  return 1 / avg;
}

function blendDimension(corr: number, twoNN: number, embeddingDimension: number): number {
  const corrOk = Number.isFinite(corr) && corr > 0;
  const twoNNOkRaw = Number.isFinite(twoNN) && twoNN > 0;
  const twoNNOk =
    twoNNOkRaw &&
    (twoNN as number) <= embeddingDimension + 0.25 &&
    (!corrOk || (twoNN as number) <= Math.max(embeddingDimension + 0.25, corr * 1.9));
  if (corrOk && twoNNOk) {
    return 0.35 * corr + 0.65 * twoNN;
  }
  if (twoNNOk) return twoNN;
  if (corrOk) return corr;
  return NaN;
}

function linearRegression(
  xs: number[],
  ys: number[],
): { slope: number; intercept: number; rSquared: number } {
  const n = Math.min(xs.length, ys.length);
  if (n <= 1) return { slope: 0, intercept: 0, rSquared: 0 };

  const meanX = mean(xs);
  const meanY = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    den += dx * dx;
  }
  if (den <= 0) return { slope: 0, intercept: meanY, rSquared: 0 };

  const slope = num / den;
  const intercept = meanY - slope * meanX;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yHat = slope * xs[i] + intercept;
    const err = ys[i] - yHat;
    const dy = ys[i] - meanY;
    ssRes += err * err;
    ssTot += dy * dy;
  }
  const rSquared = ssTot > 0 ? clamp(1 - ssRes / ssTot, 0, 1) : 0;
  return { slope, intercept, rSquared };
}

function quantile(values: number[], q: number): number {
  if (!values.length) return NaN;
  const idx = Math.max(0, Math.min(values.length - 1, Math.floor(q * (values.length - 1))));
  return values[idx] ?? NaN;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
