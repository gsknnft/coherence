import type {
  GeometricInstabilityInput,
  GeometricInstabilityState,
} from "./types.js";

const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? Number(value.toFixed(4)) : 0));

export function resolveBasinStrength(
  lambdaMin?: number,
  conditionNumber?: number,
  violationRate?: number,
): number {
  if (lambdaMin == null) return 0.5;

  // nonlinear sensitivity near zero
  const contraction = Math.max(0, lambdaMin);
  const curvature = Math.tanh(contraction * 4);

  const conditioning =
    conditionNumber == null ? 0 : Math.min(1, Math.log10(conditionNumber) / 4);

  const violation = violationRate == null ? 0 : Math.min(1, violationRate);

  let basin =
    0.7 * curvature + 0.2 * (1 - conditioning) + 0.1 * (1 - violation);

  return Math.max(0, Math.min(1, basin));
}

export function resolveGeometricInstability(
  input: GeometricInstabilityInput,
): GeometricInstabilityState {
  const diagnostics: string[] = [];

  const lambdaMin = finiteMin(
    input.geometry?.curvature?.lambdaMin,
    input.jResolution?.lambdaMin,
  );
  const conditionNumber = finiteOr(input.geometry?.curvature?.conditionNumber, Number.NaN);
  const health = clamp01(finiteOr(input.geometry?.health, 0.5));
  const validityTrusted = input.geometry?.validityTrusted === true;
  const violationRate = clamp01(
    finiteMax(
      input.geometry?.stability?.violationRate,
      input.jResolution?.deltaJViolationRate,
      0,
    ),
  );
  const p95DeltaJ = finiteOr(input.geometry?.stability?.p95DeltaJ, 0);
  const stable = input.geometry?.stability?.stable;
  const resolved = input.jResolution?.resolved === true;
  const basinHoldMet = input.jResolution?.basinHoldMet === true;
  const regime = String(input.regime?.regime ?? "").toLowerCase();
  const regimeConfidence = clamp01(finiteOr(input.regime?.confidence, 0.5));
  const symmetry = clamp01(finiteOr(input.morphology?.symmetry, 0.5));
  const roughness = clamp01(finiteOr(input.morphology?.roughness, 0.5));
  const anisotropy = clamp01(finiteOr(input.morphology?.anisotropy, 0.5));
  const fitError = clamp01(finiteOr(input.morphology?.fitError, 0.5));
  const driftRate = clamp01(Math.abs(finiteOr(input.transition?.driftRate, 0)));
  const driftAccel = clamp01(Math.abs(finiteOr(input.transition?.driftAccel, 0)));
  const gamma = finiteOr(input.transition?.gamma, 1);
  const entropy = clamp01(finiteOr(input.transition?.entropy, 0.5));
  const attractorSimilarity = clamp01(
    finiteOr(input.transition?.attractorSimilarity, 0.35),
  );

  const curvatureStress = resolveCurvatureStress(
    Number.isFinite(lambdaMin) ? lambdaMin : undefined,
    Number.isFinite(conditionNumber) ? conditionNumber : undefined,
    p95DeltaJ > 0 ? p95DeltaJ : undefined,
  );
  const conditionRisk =
    Number.isFinite(conditionNumber) ? clamp01(safeLog10(conditionNumber) / 4) : 0.35;
  const negativeCurvatureRisk =
    Number.isFinite(lambdaMin) && lambdaMin < 0
      ? clamp01(0.6 + Math.min(Math.abs(lambdaMin), 0.2) / 0.2 * 0.4)
      : 0;
  let curvatureRisk = curvatureStress;
  if (regime === "unstable" || regime === "turbulent" || regime === "model-mismatch") {
    curvatureRisk = clamp01(curvatureRisk + 0.05);
  }
  if (anisotropy > 0.7) {
    curvatureRisk = clamp01(curvatureRisk + 0.03);
  }
  if (roughness > 0.75) {
    curvatureRisk = clamp01(curvatureRisk + 0.03);
  }
  if (fitError > 0.75) {
    curvatureRisk = clamp01(curvatureRisk + 0.03);
  }

  const p95Risk = p95DeltaJ > 0 ? clamp01(p95DeltaJ / 0.2) : 0;
  const gammaRisk = gamma > 1 ? clamp01((gamma - 1) / 1.2) : 0;
  const regimeExpansionRisk =
    regime === "unstable"
      ? 0.92
      : regime === "model-mismatch"
        ? 0.82
        : regime === "chaotic"
          ? 0.72
          : regime === "turbulent"
            ? 0.5
            : 0;

  const dominantExpansion = clamp01(
    Math.max(
      violationRate,
      p95Risk,
      driftRate * 0.7,
      driftAccel,
      gammaRisk,
      attractorSimilarity * (regime === "chaotic" ? 1 : 0.45),
      regimeExpansionRisk,
    ),
  );

  const basinStrength = clamp01(
    0.34 * (Number.isFinite(lambdaMin) && lambdaMin > 0 ? clamp01(lambdaMin / 0.16) : 0) +
      0.2 * (1 - conditionRisk) +
      0.16 * health +
      0.12 * (basinHoldMet ? 1 : 0) +
      0.1 * (resolved ? 1 : 0) +
      0.08 * (validityTrusted ? 1 : 0) +
      0.08 * symmetry -
      0.14 * roughness -
      0.14 * entropy,
  );

  const lyapunovSlack = clamp01(
    Math.max(
      violationRate,
      p95Risk,
      stable === false ? 0.72 : 0,
      resolved ? 0 : 0.3,
      driftAccel * 0.9,
    ),
  );

  let unstableModes = 0;
  if (negativeCurvatureRisk > 0.2) unstableModes += 1;
  if (dominantExpansion >= 0.6) unstableModes += 1;
  if (regime === "unstable" || regime === "model-mismatch" || regime === "chaotic") {
    unstableModes += 1;
  }

  const instability = clamp01(
    0.3 * curvatureRisk +
      0.25 * dominantExpansion +
      0.25 * (1 - basinStrength) +
      0.2 * lyapunovSlack,
  );

  const evidenceCoverage = [
    Number.isFinite(lambdaMin),
    Number.isFinite(conditionNumber),
    input.geometry?.stability?.stable !== undefined,
    input.geometry?.stability?.violationRate !== undefined,
    input.jResolution?.resolved !== undefined,
    input.regime?.regime !== undefined,
    input.morphology?.roughness !== undefined,
    input.transition?.driftAccel !== undefined,
  ].filter(Boolean).length / 8;
  const confidence = clamp01(
    0.5 * evidenceCoverage +
      0.25 * regimeConfidence +
      0.15 * health +
      0.1 * (validityTrusted ? 1 : 0),
  );

  diagnostics.push(`curvature_risk:${curvatureRisk.toFixed(3)}`);
  diagnostics.push(`curvature_stress:${curvatureStress.toFixed(3)}`);
  diagnostics.push(`dominant_expansion:${dominantExpansion.toFixed(3)}`);
  diagnostics.push(`basin_strength:${basinStrength.toFixed(3)}`);
  diagnostics.push(`lyapunov_slack:${lyapunovSlack.toFixed(3)}`);
  diagnostics.push(`unstable_modes:${unstableModes}`);
  if (Number.isFinite(lambdaMin)) diagnostics.push(`lambda_min:${lambdaMin.toFixed(4)}`);
  if (Number.isFinite(conditionNumber)) {
    diagnostics.push(`condition:${conditionNumber.toFixed(3)}`);
  }
  if (regime) diagnostics.push(`regime:${regime}`);
  if (basinHoldMet) diagnostics.push("basin_hold");
  if (resolved) diagnostics.push("jspace_resolved");
  if (validityTrusted) diagnostics.push("geometry_trusted");

  return {
    instability,
    basinStrength,
    unstableModes,
    dominantExpansion,
    curvatureRisk,
    lyapunovSlack,
    confidence,
    diagnostics,
  };
}

function finiteOr(value: number | null | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function finiteMax(...values: Array<number | null | undefined>): number {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  return finite.length ? Math.max(...finite) : 0;
}

function finiteMin(...values: Array<number | null | undefined>): number {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  return finite.length ? Math.min(...finite) : Number.NaN;
}

export function resolveCurvatureStress(
  lambdaMin?: number,
  conditionNumber?: number,
  p95DeltaJ?: number,
): number {
  const lambdaStress =
    lambdaMin == null
      ? 0
      : lambdaMin < 0
        ? 1
        : clamp01(1 - clamp01(lambdaMin));
  const conditionStress =
    conditionNumber == null ? 0 : clamp01(safeLog10(conditionNumber) / 4);
  const expansionStress =
    p95DeltaJ == null ? 0 : clamp01(p95DeltaJ / 0.5);

  return clamp01(
    0.5 * lambdaStress + 0.3 * conditionStress + 0.2 * expansionStress,
  );
}

function safeLog10(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.log10(value);
}
