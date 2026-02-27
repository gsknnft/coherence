import type { GeometricRegimeLabel } from "../geometric-regime.js";

export type DriftFeatures = {
  health: number;
  lambdaMin: number;
  violationRate: number;
  stateM?: number;
  stateV?: number;
  stateR?: number;
  flowMeanCos?: number;
  flowAbsCos?: number;
  attractorSim?: number;
};

export type DriftFeatureFrameInput = {
  geometryState?: {
    health?: number;
    curvature?: { lambdaMin?: number };
    stability?: { violationRate?: number };
    state?: [number, number, number];
  };
  attractorComparison?: {
    similarity?: number;
    diagnostics?: {
      flowAlignment?: number | null;
      flowAlignmentAbs?: number | null;
    };
  };
  regime?: { regime?: GeometricRegimeLabel };
};

export function featuresFromFrame(input: DriftFeatureFrameInput): DriftFeatures {
  const g = input.geometryState;
  const s = Array.isArray(g?.state) ? g.state : undefined;
  return {
    health: finiteOrZero(g?.health),
    lambdaMin: finiteOrZero(g?.curvature?.lambdaMin),
    violationRate: finiteOrZero(g?.stability?.violationRate),
    stateM: finiteOrUndefined(s?.[0]),
    stateV: finiteOrUndefined(s?.[1]),
    stateR: finiteOrUndefined(s?.[2]),
    flowMeanCos: finiteOrUndefined(input.attractorComparison?.diagnostics?.flowAlignment),
    flowAbsCos: finiteOrUndefined(input.attractorComparison?.diagnostics?.flowAlignmentAbs),
    attractorSim: finiteOrUndefined(input.attractorComparison?.similarity),
  };
}

export function driftRate(
  a: DriftFeatures,
  b: DriftFeatures,
  dtSeconds: number,
): number {
  const dt = Math.max(dtSeconds, 1e-6);
  const sq =
    square(a.health - b.health) +
    square(a.lambdaMin - b.lambdaMin) +
    square(a.violationRate - b.violationRate) +
    square((a.stateM ?? 0) - (b.stateM ?? 0)) +
    square((a.stateV ?? 0) - (b.stateV ?? 0)) +
    square((a.stateR ?? 0) - (b.stateR ?? 0)) +
    square((a.flowMeanCos ?? 0) - (b.flowMeanCos ?? 0)) +
    square((a.flowAbsCos ?? 0) - (b.flowAbsCos ?? 0)) +
    square((a.attractorSim ?? 0) - (b.attractorSim ?? 0));
  return Math.sqrt(sq) / dt;
}

function finiteOrZero(value: number | null | undefined): number {
  return Number.isFinite(value) ? (value as number) : 0;
}

function finiteOrUndefined(value: number | null | undefined): number | undefined {
  return Number.isFinite(value) ? (value as number) : undefined;
}

function square(value: number): number {
  return value * value;
}
