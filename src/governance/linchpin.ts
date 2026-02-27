import type { GeometricRegimeLabel } from "../geometric-regime.js";

export type LinchpinMetric =
  | "alignment"
  | "alignmentDelta"
  | "dimension"
  | "dimensionDelta"
  | "driftRate"
  | "driftAccel"
  | "gamma"
  | "entropy"
  | "lambdaMin"
  | "attractorSimilarity";

export type LinchpinDirection = "positive" | "negative" | "mixed";

export type LinchpinObservation = {
  ts?: number;
  regime?: GeometricRegimeLabel;
  transition?: boolean;
  alignment?: number | null;
  alignmentDelta?: number | null;
  dimension?: number | null;
  dimensionDelta?: number | null;
  driftRate?: number | null;
  gamma?: number | null;
  entropy?: number | null;
  lambdaMin?: number | null;
  attractorSimilarity?: number | null;
};

export type LinchpinScore = {
  metric: LinchpinMetric;
  influence: number;
  correlation: number;
  leadSteps: number;
  sampleCount: number;
  eventCount: number;
  direction: LinchpinDirection;
};

export type LinchpinAnalysis = {
  best: LinchpinScore | null;
  ranking: LinchpinScore[];
  transitionRate: number;
  transitionCount: number;
  sampleCount: number;
  notes: string[];
};

export type LinchpinOptions = {
  maxLeadSteps?: number;
  minSamples?: number;
  minEvents?: number;
};

const METRICS: LinchpinMetric[] = [
  "alignment",
  "alignmentDelta",
  "dimension",
  "dimensionDelta",
  "driftRate",
  "driftAccel",
  "gamma",
  "entropy",
  "lambdaMin",
  "attractorSimilarity",
];

export function analyzeLinchpin(
  observations: LinchpinObservation[],
  options: LinchpinOptions = {},
): LinchpinAnalysis {
  const maxLeadSteps = Math.max(0, Math.floor(options.maxLeadSteps ?? 4));
  const minSamples = Math.max(8, Math.floor(options.minSamples ?? 24));
  const minEvents = Math.max(1, Math.floor(options.minEvents ?? 2));

  if (observations.length < minSamples) {
    return {
      best: null,
      ranking: [],
      transitionRate: 0,
      transitionCount: 0,
      sampleCount: observations.length,
      notes: ["insufficient_samples"],
    };
  }

  const transitions = deriveTransitions(observations);
  const transitionCount = transitions.reduce((acc, v) => acc + (v ? 1 : 0), 0);
  const transitionRate =
    transitions.length > 1 ? transitionCount / (transitions.length - 1) : 0;

  if (transitionCount < minEvents) {
    return {
      best: null,
      ranking: [],
      transitionRate,
      transitionCount,
      sampleCount: observations.length,
      notes: ["insufficient_transition_events"],
    };
  }

  const ranking: LinchpinScore[] = [];
  const driftAccel = derivativeSeries(observations, (o) => finiteOrUndefined(o.driftRate));

  for (const metric of METRICS) {
    const series = metricSeries(metric, observations, driftAccel);
    const score = bestLeadScore(series, transitions, maxLeadSteps, minSamples, minEvents, metric);
    if (score) ranking.push(score);
  }

  ranking.sort((a, b) => b.influence - a.influence);
  return {
    best: ranking[0] ?? null,
    ranking,
    transitionRate,
    transitionCount,
    sampleCount: observations.length,
    notes: [],
  };
}

function deriveTransitions(observations: LinchpinObservation[]): boolean[] {
  const out: boolean[] = [];
  let prevRegime = observations[0]?.regime;
  for (let i = 0; i < observations.length; i++) {
    const explicit = observations[i]?.transition;
    if (typeof explicit === "boolean") {
      out.push(explicit);
      if (observations[i]?.regime) prevRegime = observations[i]?.regime;
      continue;
    }

    if (i === 0) {
      out.push(false);
      continue;
    }
    const regime = observations[i]?.regime;
    const changed = Boolean(regime && prevRegime && regime !== prevRegime);
    out.push(changed);
    if (regime) prevRegime = regime;
  }
  return out;
}

function derivativeSeries(
  observations: LinchpinObservation[],
  select: (obs: LinchpinObservation) => number | undefined,
): Array<number | undefined> {
  const out: Array<number | undefined> = new Array(observations.length);
  for (let i = 1; i < observations.length; i++) {
    const curr = select(observations[i]);
    const prev = select(observations[i - 1]);
    out[i] =
      Number.isFinite(curr) && Number.isFinite(prev)
        ? (curr as number) - (prev as number)
        : undefined;
  }
  return out;
}

function metricSeries(
  metric: LinchpinMetric,
  observations: LinchpinObservation[],
  driftAccel: Array<number | undefined>,
): Array<number | undefined> {
  switch (metric) {
    case "alignment":
      return observations.map((o) => finiteOrUndefined(o.alignment));
    case "alignmentDelta":
      return observations.map((o) => finiteOrUndefined(o.alignmentDelta));
    case "dimension":
      return observations.map((o) => finiteOrUndefined(o.dimension));
    case "dimensionDelta":
      return observations.map((o) => finiteOrUndefined(o.dimensionDelta));
    case "driftRate":
      return observations.map((o) => finiteOrUndefined(o.driftRate));
    case "driftAccel":
      return driftAccel;
    case "gamma":
      return observations.map((o) => finiteOrUndefined(o.gamma));
    case "entropy":
      return observations.map((o) => finiteOrUndefined(o.entropy));
    case "lambdaMin":
      return observations.map((o) => finiteOrUndefined(o.lambdaMin));
    case "attractorSimilarity":
      return observations.map((o) => finiteOrUndefined(o.attractorSimilarity));
    default:
      return [];
  }
}

function bestLeadScore(
  series: Array<number | undefined>,
  transitions: boolean[],
  maxLeadSteps: number,
  minSamples: number,
  minEvents: number,
  metric: LinchpinMetric,
): LinchpinScore | null {
  let best: LinchpinScore | null = null;

  for (let lead = 0; lead <= maxLeadSteps; lead++) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i + lead < series.length && i + lead < transitions.length; i++) {
      const x = series[i];
      if (!Number.isFinite(x)) continue;
      xs.push(x as number);
      ys.push(transitions[i + lead] ? 1 : 0);
    }
    if (xs.length < minSamples) continue;
    const events = ys.reduce((acc, v) => acc + (v === 1 ? 1 : 0), 0);
    if (events < minEvents || events >= ys.length) continue;

    const r = pointBiserial(xs, ys);
    const coverage = xs.length / series.length;
    const influence = Math.abs(r) * Math.sqrt(coverage);
    const score: LinchpinScore = {
      metric,
      influence,
      correlation: r,
      leadSteps: lead,
      sampleCount: xs.length,
      eventCount: events,
      direction: r > 0.08 ? "positive" : r < -0.08 ? "negative" : "mixed",
    };

    if (!best || score.influence > best.influence) {
      best = score;
    }
  }

  return best;
}

function pointBiserial(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n <= 2) return 0;
  const positives: number[] = [];
  const negatives: number[] = [];
  for (let i = 0; i < n; i++) {
    if (ys[i] === 1) positives.push(xs[i]);
    else negatives.push(xs[i]);
  }
  if (!positives.length || !negatives.length) return 0;

  const meanPos = mean(positives);
  const meanNeg = mean(negatives);
  const sigma = stdDev(xs);
  if (sigma <= 1e-12) return 0;

  const p = positives.length / n;
  const q = 1 - p;
  return ((meanPos - meanNeg) / sigma) * Math.sqrt(p * q);
}

function finiteOrUndefined(value: number | null | undefined): number | undefined {
  return Number.isFinite(value) ? (value as number) : undefined;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) * (v - m), 0) / values.length;
  return Math.sqrt(variance);
}
