import {
  classifyDimensionBand,
  type DimensionBand,
} from "../dynamics/dimension.js";

export interface StructuralPersistenceObservation {
  ts?: number;
  dimension?: number | null;
  dimensionBand?: DimensionBand;
  flowAlignment?: number | null;
  gamma?: number | null;
  posteriorEntropy?: number | null;
  driftRate?: number | null;
  basinHold?: boolean | null;
  coherenceDensity?: number | null;
}

export interface StructuralPersistenceComponents {
  dimensionBandStability: number;
  alignmentStability: number;
  barrierContainment: number;
  posteriorSettling: number;
  basinHold: number;
  coherenceDensityStability: number;
  driftAccelerationPenalty: number;
}

export interface StructuralPersistenceOptions {
  minSamples?: number;
  gateThreshold?: number;
  gammaAlert?: number;
  embeddingDimension?: number;
}

export interface StructuralPersistenceResult {
  score: number;
  metastability: number;
  gatePassed: boolean;
  dominantRisk:
    | "insufficient-samples"
    | "drift-acceleration"
    | "barrier-instability"
    | "band-instability"
    | "posterior-churn"
    | "basin-loss"
    | "stable";
  sampleCount: number;
  components: StructuralPersistenceComponents;
  diagnostics: string[];
}

export function evaluateStructuralPersistence(
  observations: StructuralPersistenceObservation[],
  options: StructuralPersistenceOptions = {},
): StructuralPersistenceResult {
  const minSamples = Math.max(6, Math.floor(options.minSamples ?? 12));
  const gateThreshold = clamp01(options.gateThreshold ?? 0.62);
  const gammaAlert = Math.max(1.05, options.gammaAlert ?? 2.0);
  const embeddingDimension = Math.max(2, Math.floor(options.embeddingDimension ?? 3));
  const diagnostics: string[] = [];

  if (observations.length < minSamples) {
    return {
      score: 0,
      metastability: 1,
      gatePassed: false,
      dominantRisk: "insufficient-samples",
      sampleCount: observations.length,
      components: {
        dimensionBandStability: 0,
        alignmentStability: 0,
        barrierContainment: 0,
        posteriorSettling: 0,
        basinHold: 0,
        coherenceDensityStability: 0,
        driftAccelerationPenalty: 1,
      },
      diagnostics: ["insufficient_samples"],
    };
  }

  const bands = observations
    .map((obs) => obs.dimensionBand ?? classifyDimensionBand(obs.dimension, { embeddingDimension }))
    .filter((band) => band !== "undetermined");
  const dimensionBandStability = dominantBandRatio(bands);
  if (!bands.length) diagnostics.push("dimension_band_unavailable");

  const alignments = finiteSeries(observations.map((obs) => obs.flowAlignment));
  const alignmentStability = alignments.length
    ? clamp01(1 - stddev(alignments) / 0.5)
    : 0.5;
  if (!alignments.length) diagnostics.push("flow_alignment_unavailable");

  const gammas = finiteSeries(observations.map((obs) => obs.gamma));
  const barrierContainment = gammas.length
    ? clamp01(
        1 -
          mean(gammas.map((gamma) => Math.max(0, gamma - 1) / Math.max(0.1, gammaAlert - 1))) *
            0.8 -
          gammas.filter((gamma) => gamma >= gammaAlert).length / gammas.length * 0.4,
      )
    : 0.5;
  if (!gammas.length) diagnostics.push("gamma_unavailable");

  const posteriors = finiteSeries(observations.map((obs) => obs.posteriorEntropy));
  const posteriorSettling = posteriors.length >= 2
    ? scorePosteriorSettling(posteriors)
    : 0.5;
  if (posteriors.length < 2) diagnostics.push("posterior_entropy_unavailable");

  const basinHoldSeries = observations
    .map((obs) => obs.basinHold)
    .filter((value): value is boolean => typeof value === "boolean");
  const basinHold = basinHoldSeries.length
    ? basinHoldSeries.filter(Boolean).length / basinHoldSeries.length
    : 0.5;
  if (!basinHoldSeries.length) diagnostics.push("basin_hold_unavailable");

  const coherenceDensity = finiteSeries(observations.map((obs) => obs.coherenceDensity));
  const coherenceDensityStability = coherenceDensity.length
    ? clamp01(mean(coherenceDensity) * (1 - stddev(coherenceDensity) / 0.35))
    : 0.5;
  if (!coherenceDensity.length) diagnostics.push("coherence_density_unavailable");

  const driftRates = finiteSeries(observations.map((obs) => obs.driftRate));
  const driftAccelerationPenalty = driftRates.length >= 3
    ? clamp01(mean(secondDifferences(driftRates).map((value) => Math.abs(value))) / 0.35)
    : 0.25;
  if (driftRates.length < 3) diagnostics.push("drift_acceleration_under_sampled");

  const score = clamp01(
    0.24 * dimensionBandStability +
      0.16 * alignmentStability +
      0.16 * barrierContainment +
      0.16 * posteriorSettling +
      0.14 * basinHold +
      0.14 * coherenceDensityStability -
      0.2 * driftAccelerationPenalty,
  );

  const metastability = clamp01(
    0.45 * (1 - score) +
      0.35 * driftAccelerationPenalty +
      0.2 * (1 - basinHold),
  );

  const gatePassed =
    score >= gateThreshold &&
    metastability <= 0.45 &&
    basinHold >= 0.45 &&
    barrierContainment >= 0.4;

  const dominantRisk = resolveDominantRisk({
    score,
    dimensionBandStability,
    barrierContainment,
    posteriorSettling,
    basinHold,
    driftAccelerationPenalty,
  });

  diagnostics.push(`spi:${score.toFixed(3)}`);
  diagnostics.push(`metastability:${metastability.toFixed(3)}`);
  if (gatePassed) diagnostics.push("persistence_gate_passed");

  return {
    score,
    metastability,
    gatePassed,
    dominantRisk,
    sampleCount: observations.length,
    components: {
      dimensionBandStability,
      alignmentStability,
      barrierContainment,
      posteriorSettling,
      basinHold,
      coherenceDensityStability,
      driftAccelerationPenalty,
    },
    diagnostics,
  };
}

function scorePosteriorSettling(series: number[]): number {
  const slope = series[series.length - 1] - series[0];
  const volatility = stddev(series);
  const trendReward = clamp01(0.5 - slope * 1.25);
  const volatilityReward = clamp01(1 - volatility / 0.2);
  return clamp01(0.6 * trendReward + 0.4 * volatilityReward);
}

function dominantBandRatio(bands: DimensionBand[]): number {
  if (!bands.length) return 0;
  const counts = new Map<DimensionBand, number>();
  for (const band of bands) counts.set(band, (counts.get(band) ?? 0) + 1);
  return Math.max(...counts.values()) / bands.length;
}

function resolveDominantRisk(args: {
  score: number;
  dimensionBandStability: number;
  barrierContainment: number;
  posteriorSettling: number;
  basinHold: number;
  driftAccelerationPenalty: number;
}): StructuralPersistenceResult["dominantRisk"] {
  if (args.score >= 0.75 && args.driftAccelerationPenalty < 0.25 && args.basinHold > 0.7) {
    return "stable";
  }
  if (args.driftAccelerationPenalty >= 0.6) return "drift-acceleration";
  if (args.barrierContainment <= 0.35) return "barrier-instability";
  if (args.dimensionBandStability <= 0.45) return "band-instability";
  if (args.posteriorSettling <= 0.4) return "posterior-churn";
  if (args.basinHold <= 0.4) return "basin-loss";
  return "band-instability";
}

function finiteSeries(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => Number.isFinite(value));
}

function secondDifferences(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 2; i < values.length; i += 1) {
    out.push(values[i] - 2 * values[i - 1] + values[i - 2]);
  }
  return out;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mu = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mu) * (value - mu), 0) /
    Math.max(1, values.length - 1);
  return Math.sqrt(variance);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
