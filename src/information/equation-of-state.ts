/**
 * The equation of state: dS = beta d<E>, and what follows from it.
 *
 * ---
 *
 * WHAT THIS IS, STATED CAREFULLY, BECAUSE THE NAME INVITES MORE THAN IT DELIVERS.
 *
 * Jacobson's 1995 result derives the Einstein field equations by applying the
 * Clausius relation dQ = T dS to local Rindler horizons, with S proportional to
 * horizon area. Recent work replaces the thermodynamic entropy in that argument
 * with Araki-Uhlmann relative entropy on a von Neumann algebra.
 *
 * This file implements none of that. It implements the relation those arguments
 * *start from*: the Gibbs identity of classical statistical mechanics, which for a
 * maximum-entropy distribution under one constraint is exactly
 *
 *   S = beta <E> + log Z        and therefore        dS = beta d<E>
 *
 * That is dQ = T dS with T = 1/beta. It is nineteenth-century thermodynamics, it
 * is provable in three lines from the Boltzmann form, and it has nothing
 * whatsoever to do with horizons, areas, or spacetime. Jacobson's contribution was
 * the leap to horizons; the identity itself was never the hard part.
 *
 * So: a `fitGibbs` on a spectral histogram gives an effective temperature for a
 * regime. It does not measure a temperature of anything physical, and the fitted
 * beta is a Lagrange multiplier, not a thermometer reading. The word "energy"
 * below means "whatever scalar the caller attached to each outcome" — a bin index,
 * a log-frequency, a rank — and nothing more.
 *
 * ---
 *
 * WHY IT IS WORTH HAVING ANYWAY.
 *
 * One result here earns its place on the merits, independent of any physics
 * analogy: the fluctuation-response relation
 *
 *   C = beta^2 * Var(E)
 *
 * Heat capacity is proportional to the variance of the energy. In a thermodynamic
 * limit, singular or scaling response can help identify a phase transition. A
 * finite distribution can also have a perfectly ordinary smooth response peak
 * (the two-level Schottky anomaly is the simplest example), so a peak here is NOT
 * evidence of a phase transition. Applied to a regime's own distribution it gives
 * a response/crossover indicator computed from one window, with no baseline or
 * sequence required.
 *
 * That complements `regimeDisplacement`, which needs a reference, and the
 * trajectory machinery, which needs a chronology. This needs neither. It answers
 * "is this distribution poised?" rather than "has it moved?".
 */

import { toDistribution } from "./relative-entropy.js";

const SUPPORT_EPSILON = 1e-12;
/** Bisection bounds on beta. Beyond these the distribution is a point mass. */
const BETA_BOUND = 700;
const BISECTION_STEPS = 200;

export interface GibbsState {
  /** The Lagrange multiplier. Positive means low-energy outcomes are favoured. */
  beta: number;
  /**
   * 1 / beta. Infinite as beta -> 0 (uniform), and negative for beta < 0.
   *
   * A negative effective temperature is not an error and not exotic: it simply
   * means the distribution favours HIGH-energy outcomes, which is ordinary for a
   * bounded energy spectrum and is why the sign is reported rather than clamped.
   */
  effectiveTemperature: number;
  /** Partition function log Z, needed for the entropy identity. */
  logZ: number;
  /** Mean energy of the fitted distribution. Matches the observed mean by construction. */
  meanEnergy: number;
  /** Variance of the energy under the fitted distribution. */
  energyVariance: number;
  /**
   * Heat capacity, beta^2 * Var(E). A finite-system response measure; a peak
   * alone is not evidence of a phase transition.
   *
   * Dimensionless here, since the energies are whatever the caller supplied.
   */
  heatCapacity: number;
  /** Entropy of the fitted distribution, in nats. */
  entropy: number;
  /** The fitted maximum-entropy distribution itself. */
  distribution: number[];
}

export type GibbsResult =
  | { kind: "value"; state: GibbsState; iterations: number }
  | { kind: "unavailable"; reason: string };

/** Mean energy under the Boltzmann distribution for a given beta. */
function boltzmann(energies: readonly number[], beta: number): { p: number[]; logZ: number; mean: number } {
  // Shift by the minimum exponent before exponentiating; exp(-beta*E) overflows
  // for very ordinary energies and betas otherwise.
  let maxExponent = -Infinity;
  for (const e of energies) {
    const exponent = -beta * e;
    if (exponent > maxExponent) maxExponent = exponent;
  }

  let z = 0;
  const weights = energies.map((e) => {
    const w = Math.exp(-beta * e - maxExponent);
    z += w;
    return w;
  });

  const p = weights.map((w) => w / z);
  let mean = 0;
  for (let i = 0; i < p.length; i++) mean += p[i]! * energies[i]!;

  return { p, logZ: Math.log(z) + maxExponent, mean };
}

/**
 * Fit a maximum-entropy (Gibbs) distribution matching an observed mean energy.
 *
 * Solves for the beta whose Boltzmann distribution reproduces `targetMeanEnergy`.
 * The mean is strictly decreasing in beta, so bisection is both applicable and
 * unconditionally convergent — no derivative, no initial guess, no divergence.
 *
 * Returns unavailable when the target sits at or outside the energy range, where
 * the required beta is infinite. That boundary is a real answer: a distribution
 * concentrated entirely on the lowest-energy outcome has no finite temperature,
 * and reporting a large finite beta instead would be an artifact of the bound.
 */
export function fitGibbs(energies: readonly number[], targetMeanEnergy: number): GibbsResult {
  if (energies.length < 2) {
    return { kind: "unavailable", reason: `need at least 2 outcomes, got ${energies.length}` };
  }
  for (const e of energies) {
    if (!Number.isFinite(e)) return { kind: "unavailable", reason: "energies must all be finite" };
  }
  if (!Number.isFinite(targetMeanEnergy)) {
    return { kind: "unavailable", reason: "target mean energy must be finite" };
  }

  const min = Math.min(...energies);
  const max = Math.max(...energies);
  if (max - min < SUPPORT_EPSILON) {
    return {
      kind: "unavailable",
      reason: "all outcomes have the same energy, so beta is unidentifiable — every beta gives the uniform distribution",
    };
  }
  if (targetMeanEnergy <= min + SUPPORT_EPSILON || targetMeanEnergy >= max - SUPPORT_EPSILON) {
    return {
      kind: "unavailable",
      reason:
        `target mean energy ${targetMeanEnergy} is at or outside the energy range [${min}, ${max}], where the required beta is infinite. ` +
        "A distribution concentrated on an extreme outcome has no finite temperature; a large finite beta here would be an artifact of the search bound, not a measurement.",
    };
  }

  // Mean energy is strictly decreasing in beta, so bracket and bisect.
  let lo = -BETA_BOUND;
  let hi = BETA_BOUND;
  let iterations = 0;

  for (let i = 0; i < BISECTION_STEPS; i++) {
    iterations = i + 1;
    const mid = (lo + hi) / 2;
    const { mean } = boltzmann(energies, mid);
    if (Math.abs(mean - targetMeanEnergy) < 1e-12) {
      lo = mid;
      hi = mid;
      break;
    }
    if (mean > targetMeanEnergy) lo = mid;
    else hi = mid;
  }

  const beta = (lo + hi) / 2;
  const { p, logZ, mean } = boltzmann(energies, beta);

  let variance = 0;
  for (let i = 0; i < p.length; i++) variance += p[i]! * (energies[i]! - mean) ** 2;

  // S = beta<E> + log Z. Equivalent to -sum p log p, and computed this way
  // because it is the identity the equation of state rests on.
  const entropy = beta * mean + logZ;

  return {
    kind: "value",
    iterations,
    state: {
      beta,
      effectiveTemperature: Math.abs(beta) < SUPPORT_EPSILON ? Infinity : 1 / beta,
      logZ,
      meanEnergy: mean,
      energyVariance: variance,
      heatCapacity: beta * beta * variance,
      entropy,
      distribution: p,
    },
  };
}

/**
 * Fit a Gibbs state to an observed distribution over outcomes with given energies.
 *
 * Convenience over `fitGibbs`: computes the observed mean energy and fits to it.
 * The result is the maximum-entropy distribution consistent with that mean — the
 * least-committed distribution reproducing the one statistic supplied.
 *
 * The gap between the fit and the observation is itself informative, and
 * `gibbsResidual` measures it. A large residual means the mean energy does not
 * summarise this distribution, which is a finding about the choice of observable.
 */
export function fitGibbsToObserved(
  observed: readonly number[],
  energies: readonly number[],
): GibbsResult {
  if (observed.length !== energies.length) {
    return {
      kind: "unavailable",
      reason: `observed distribution and energy levels have different lengths (${observed.length} vs ${energies.length})`,
    };
  }
  const p = toDistribution(observed);
  if (!p) {
    return {
      kind: "unavailable",
      reason: "observed values could not be normalized to a distribution (empty, negative, or all-zero)",
    };
  }
  let mean = 0;
  for (let i = 0; i < p.length; i++) mean += p[i]! * energies[i]!;
  return fitGibbs(energies, mean);
}

export interface EquationOfStateCheck {
  /** S(after) - S(before), in nats. */
  entropyChange: number;
  /** <E>(after) - <E>(before). */
  energyChange: number;
  /** beta at the midpoint, the temperature the relation is evaluated at. */
  midpointBeta: number;
  /** beta_mid * d<E> — what dS should equal if the relation holds. */
  predictedEntropyChange: number;
  /** predicted - actual. Small for small steps, growing as beta varies over the step. */
  residual: number;
  /**
   * |residual| / |entropyChange|, or null when the entropy did not change.
   *
   * The relation is exact only in the differential limit. Over a finite step beta
   * itself moves. With midpoint beta the absolute residual is third-order in a
   * smooth step and this relative residual is second-order; shrinking it is the
   * check that the implementation is right rather than coincidentally close.
   */
  relativeResidual: number | null;
}

/**
 * Evaluate dS = beta d<E> between two Gibbs states on the same energy levels.
 *
 * The relation is a differential identity, so over a finite step it holds only
 * approximately, with beta evaluated at the midpoint. The residual is reported
 * rather than hidden. The midpoint-rule absolute residual is third-order for a
 * smooth step (the relative residual is second-order), and watching it fall as
 * the step shrinks confirms the identity is computed rather than asserted.
 */
export function checkEquationOfState(before: GibbsState, after: GibbsState): EquationOfStateCheck {
  const entropyChange = after.entropy - before.entropy;
  const energyChange = after.meanEnergy - before.meanEnergy;
  const midpointBeta = (before.beta + after.beta) / 2;
  const predictedEntropyChange = midpointBeta * energyChange;
  const residual = predictedEntropyChange - entropyChange;

  return {
    entropyChange,
    energyChange,
    midpointBeta,
    predictedEntropyChange,
    residual,
    relativeResidual: Math.abs(entropyChange) > SUPPORT_EPSILON ? Math.abs(residual) / Math.abs(entropyChange) : null,
  };
}

/**
 * How far an observed distribution departs from its own maximum-entropy fit.
 *
 * Returned as the KL divergence from observation to fit, in nats. Zero means the
 * mean energy captures everything about the distribution's shape; large means it
 * does not, and the chosen observable is the wrong summary for this data.
 *
 * This is the honest check on any maxent story. Fitting a temperature always
 * succeeds; whether the temperature *describes* anything is a separate question,
 * and this is it.
 */
export function gibbsResidual(observed: readonly number[], fitted: readonly number[]): number | null {
  const p = toDistribution(observed);
  const q = toDistribution(fitted);
  if (!p || !q || p.length !== q.length) return null;

  let sum = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i]!;
    if (pi <= SUPPORT_EPSILON) continue;
    const qi = q[i]!;
    // The fitted Boltzmann distribution is strictly positive everywhere, so this
    // cannot divide by zero — the support problem that plagues a general KL does
    // not arise when the reference is a maxent fit.
    if (qi <= SUPPORT_EPSILON) return null;
    sum += pi * Math.log(pi / qi);
  }
  return Math.max(0, sum);
}

export interface TransitionIndicator {
  heatCapacity: number;
  beta: number;
  /** Heat capacity relative to the maximum found in the sweep, 0..1. */
  normalized: number;
  /** True when this beta is at or adjacent to the sweep's peak. */
  atPeak: boolean;
}

/**
 * Sweep beta and report where heat capacity peaks.
 *
 * C = beta^2 Var(E) measures how responsive mean energy is to temperature. In a
 * thermodynamic limit, singular/scaling behaviour can support a phase-transition
 * claim. This finite sweep cannot establish that: even a two-level system has a
 * smooth Schottky peak. The location therefore says only where this chosen finite
 * model is maximally responsive between low- and high-energy configurations.
 *
 * Useful as a response/crossover indicator that needs neither a baseline nor a
 * chronology. It says nothing about whether a transition will occur.
 */
export function heatCapacitySweep(
  energies: readonly number[],
  betas: readonly number[],
): { kind: "value"; sweep: TransitionIndicator[]; peakBeta: number } | { kind: "unavailable"; reason: string } {
  if (energies.length < 2) {
    return { kind: "unavailable", reason: `need at least 2 outcomes, got ${energies.length}` };
  }
  if (betas.length === 0) {
    return { kind: "unavailable", reason: "no beta values supplied to sweep" };
  }
  if (energies.some((energy) => !Number.isFinite(energy))) {
    return { kind: "unavailable", reason: "energies must all be finite" };
  }
  if (betas.some((beta) => !Number.isFinite(beta))) {
    return { kind: "unavailable", reason: "beta values must all be finite" };
  }

  const raw = betas.map((beta) => {
    const { p, mean } = boltzmann(energies, beta);
    let variance = 0;
    for (let i = 0; i < p.length; i++) variance += p[i]! * (energies[i]! - mean) ** 2;
    return { beta, heatCapacity: beta * beta * variance };
  });

  let peakIndex = 0;
  for (let i = 1; i < raw.length; i++) {
    if (raw[i]!.heatCapacity > raw[peakIndex]!.heatCapacity) peakIndex = i;
  }
  const peak = raw[peakIndex]!.heatCapacity;

  return {
    kind: "value",
    peakBeta: raw[peakIndex]!.beta,
    sweep: raw.map((r, i) => ({
      beta: r.beta,
      heatCapacity: r.heatCapacity,
      normalized: peak > 0 ? r.heatCapacity / peak : 0,
      atPeak: Math.abs(i - peakIndex) <= 1,
    })),
  };
}
