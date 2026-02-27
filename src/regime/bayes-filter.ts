import type { GeometricRegimeLabel } from "../geometric-regime.js";

export const REGIME_STATES: GeometricRegimeLabel[] = [
  "stable-gradient",
  "stable-orbit",
  "chaotic",
  "turbulent",
  "unstable",
  "model-mismatch",
];

export type RegimePosterior = Record<GeometricRegimeLabel, number>;

export type RegimeObservation = {
  health: number;
  lambdaMin: number;
  violationRate: number;
  flowMeanCos?: number;
  flowAbsCos?: number;
  attractorSimilarity?: number;
  jspaceResolved?: boolean;
  deterministicRegime?: GeometricRegimeLabel;
};

export type BayesFilterOptions = {
  stayProbability?: number;
  deterministicBoost?: number;
};

const DEFAULT_STAY_PROB = 0.88;
const DEFAULT_BOOST = 3;

export function uniformPosterior(): RegimePosterior {
  const p = 1 / REGIME_STATES.length;
  return {
    "stable-gradient": p,
    "stable-orbit": p,
    chaotic: p,
    turbulent: p,
    unstable: p,
    "model-mismatch": p,
  };
}

export function updateRegimePosterior(
  previous: RegimePosterior | null | undefined,
  observation: RegimeObservation,
  options: BayesFilterOptions = {},
): RegimePosterior {
  const prior = previous ?? uniformPosterior();
  const stayProbability = clamp(options.stayProbability ?? DEFAULT_STAY_PROB, 0.5, 0.995);
  const deterministicBoost = Math.max(1, options.deterministicBoost ?? DEFAULT_BOOST);

  const propagated = propagatePrior(prior, stayProbability);
  const likelihood = likelihoodByState(observation, deterministicBoost);
  const out = {} as RegimePosterior;
  let z = 0;
  for (const state of REGIME_STATES) {
    const p = Math.max(1e-12, propagated[state] * likelihood[state]);
    out[state] = p;
    z += p;
  }
  if (z <= 0) return uniformPosterior();
  for (const state of REGIME_STATES) out[state] /= z;
  return out;
}

export function posteriorArgmax(posterior: RegimePosterior): GeometricRegimeLabel {
  let best: GeometricRegimeLabel = REGIME_STATES[0];
  let bestValue = posterior[best];
  for (let i = 1; i < REGIME_STATES.length; i++) {
    const k = REGIME_STATES[i];
    if (posterior[k] > bestValue) {
      best = k;
      bestValue = posterior[k];
    }
  }
  return best;
}

export function posteriorEntropy(posterior: RegimePosterior): number {
  let h = 0;
  for (const state of REGIME_STATES) {
    const p = Math.max(1e-12, posterior[state]);
    h -= p * Math.log(p);
  }
  return h;
}

export function posteriorConfidence(posterior: RegimePosterior): number {
  const maxH = Math.log(REGIME_STATES.length);
  const h = posteriorEntropy(posterior);
  return clamp(1 - h / maxH, 0, 1);
}

function propagatePrior(
  prior: RegimePosterior,
  stayProbability: number,
): RegimePosterior {
  const jump = (1 - stayProbability) / (REGIME_STATES.length - 1);
  const out = {} as RegimePosterior;
  for (const to of REGIME_STATES) {
    let p = 0;
    for (const from of REGIME_STATES) {
      p += prior[from] * (from === to ? stayProbability : jump);
    }
    out[to] = p;
  }
  return out;
}

function likelihoodByState(
  obs: RegimeObservation,
  deterministicBoost: number,
): RegimePosterior {
  const l = {} as RegimePosterior;
  for (const state of REGIME_STATES) {
    const target = TARGETS[state];
    let score = 1;
    score *= gaussian(obs.health, target.health, target.sigma.health);
    score *= gaussian(obs.lambdaMin, target.lambdaMin, target.sigma.lambdaMin);
    score *= gaussian(obs.violationRate, target.violationRate, target.sigma.violationRate);
    score *= gaussian(obs.flowMeanCos ?? 0, target.flowMeanCos, target.sigma.flowMeanCos);
    score *= gaussian(obs.flowAbsCos ?? 0.25, target.flowAbsCos, target.sigma.flowAbsCos);
    score *= gaussian(
      obs.attractorSimilarity ?? 0.35,
      target.attractorSimilarity,
      target.sigma.attractorSimilarity,
    );
    const jspaceResolved = obs.jspaceResolved ? 1 : 0;
    score *= gaussian(jspaceResolved, target.jspaceResolved, target.sigma.jspaceResolved);

    if (obs.deterministicRegime && obs.deterministicRegime === state) {
      score *= deterministicBoost;
    }
    l[state] = Math.max(1e-12, score);
  }
  return l;
}

const TARGETS: Record<
  GeometricRegimeLabel,
  {
    health: number;
    lambdaMin: number;
    violationRate: number;
    flowMeanCos: number;
    flowAbsCos: number;
    attractorSimilarity: number;
    jspaceResolved: number;
    sigma: {
      health: number;
      lambdaMin: number;
      violationRate: number;
      flowMeanCos: number;
      flowAbsCos: number;
      attractorSimilarity: number;
      jspaceResolved: number;
    };
  }
> = {
  "stable-gradient": {
    health: 0.75,
    lambdaMin: 0.12,
    violationRate: 0.03,
    flowMeanCos: -0.9,
    flowAbsCos: 0.95,
    attractorSimilarity: 0.2,
    jspaceResolved: 1,
    sigma: {
      health: 0.25,
      lambdaMin: 0.08,
      violationRate: 0.08,
      flowMeanCos: 0.3,
      flowAbsCos: 0.35,
      attractorSimilarity: 0.4,
      jspaceResolved: 0.35,
    },
  },
  "stable-orbit": {
    health: 0.65,
    lambdaMin: 0.08,
    violationRate: 0.05,
    flowMeanCos: 0,
    flowAbsCos: 0.2,
    attractorSimilarity: 0.45,
    jspaceResolved: 1,
    sigma: {
      health: 0.3,
      lambdaMin: 0.1,
      violationRate: 0.1,
      flowMeanCos: 0.22,
      flowAbsCos: 0.2,
      attractorSimilarity: 0.35,
      jspaceResolved: 0.4,
    },
  },
  chaotic: {
    health: 0.45,
    lambdaMin: 0.03,
    violationRate: 0.14,
    flowMeanCos: 0.02,
    flowAbsCos: 0.6,
    attractorSimilarity: 0.8,
    jspaceResolved: 0,
    sigma: {
      health: 0.3,
      lambdaMin: 0.12,
      violationRate: 0.14,
      flowMeanCos: 0.35,
      flowAbsCos: 0.28,
      attractorSimilarity: 0.22,
      jspaceResolved: 0.4,
    },
  },
  turbulent: {
    health: 0.52,
    lambdaMin: 0.05,
    violationRate: 0.11,
    flowMeanCos: 0.0,
    flowAbsCos: 0.35,
    attractorSimilarity: 0.45,
    jspaceResolved: 0,
    sigma: {
      health: 0.3,
      lambdaMin: 0.12,
      violationRate: 0.14,
      flowMeanCos: 0.35,
      flowAbsCos: 0.25,
      attractorSimilarity: 0.32,
      jspaceResolved: 0.45,
    },
  },
  unstable: {
    health: 0.25,
    lambdaMin: -0.02,
    violationRate: 0.24,
    flowMeanCos: 0.45,
    flowAbsCos: 0.72,
    attractorSimilarity: 0.35,
    jspaceResolved: 0,
    sigma: {
      health: 0.28,
      lambdaMin: 0.18,
      violationRate: 0.15,
      flowMeanCos: 0.35,
      flowAbsCos: 0.25,
      attractorSimilarity: 0.35,
      jspaceResolved: 0.4,
    },
  },
  "model-mismatch": {
    health: 0.35,
    lambdaMin: 0.1,
    violationRate: 0.18,
    flowMeanCos: 0.55,
    flowAbsCos: 0.75,
    attractorSimilarity: 0.4,
    jspaceResolved: 1,
    sigma: {
      health: 0.3,
      lambdaMin: 0.12,
      violationRate: 0.15,
      flowMeanCos: 0.32,
      flowAbsCos: 0.2,
      attractorSimilarity: 0.35,
      jspaceResolved: 0.35,
    },
  },
};

function gaussian(x: number, mean: number, sigma: number): number {
  const s = Math.max(1e-6, sigma);
  const d = (x - mean) / s;
  return Math.exp(-0.5 * d * d);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
