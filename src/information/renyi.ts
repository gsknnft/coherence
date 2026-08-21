/**
 * Renyi and Tsallis entropies, and the Renyi divergence family.
 *
 * The one-parameter generalisations of Shannon entropy and KL divergence. The
 * parameter alpha decides which part of the distribution the number is about:
 *
 *   alpha < 1   weights rare outcomes more heavily — sensitive to the tail
 *   alpha = 1   Shannon / KL (a limit, not a substitution)
 *   alpha = 2   collision entropy; -log of the repeat probability
 *   alpha -> oo min-entropy; governed entirely by the single most likely outcome
 *
 * That knob is the reason to have these at all. A regime whose tail is thickening
 * while its mode holds steady moves H_0.5 and leaves H_inf alone, and Shannon
 * alone cannot tell you which happened.
 *
 * ---
 *
 * ON PROVENANCE, since these have a quantum namesake.
 *
 * The quantum Renyi entropy S_n = (1-n)^-1 log Tr(rho^n) and the Petz-Renyi
 * relative entropies are the objects that appear in replica-trick calculations of
 * entanglement entropy. What is implemented here is the classical case: rho is
 * diagonal, Tr becomes a sum, and the whole thing reduces to arithmetic on a
 * probability vector.
 *
 * That reduction is exact and it is also the entire content. Nothing here knows
 * about a density matrix, a replica index, or a conical deficit. See
 * `relative-entropy.ts` for the longer statement of where this boundary sits.
 *
 * ---
 *
 * ONE GENUINELY USEFUL FACT, which is the practical reason this file exists.
 *
 * KL divergence is infinite whenever the reference assigns zero to something the
 * observation saw. `relative-entropy.ts` reports that honestly and offers
 * smoothing, but smoothing means choosing a constant, and the answer depends on
 * the constant chosen.
 *
 * The Renyi divergence with alpha < 1 has no such problem. The reference is raised
 * to the positive power (1 - alpha), so a zero there contributes zero rather than
 * dividing by zero, and the divergence is finite by construction. When a baseline
 * has holes, D_0.5 is a principled answer where a smoothed KL is an arbitrary one.
 */

import type { DivergenceResult } from "./relative-entropy.js";
import { toDistribution } from "./relative-entropy.js";

/** Below this, a probability is treated as zero. */
const SUPPORT_EPSILON = 1e-12;

/**
 * How close alpha must be to 1 before the limiting (Shannon/KL) form is used.
 *
 * The general formula has (alpha - 1) in a denominator and a numerator that also
 * vanishes there, so it is 0/0 at exactly 1 and catastrophically ill-conditioned
 * near it. Switching to the limit is not an approximation of the answer, it *is*
 * the answer at that point.
 */
const ALPHA_LIMIT_TOLERANCE = 1e-6;

export type EntropyResult =
  | { kind: "value"; value: number; alpha: number; base: "bits" | "nats" }
  | { kind: "unavailable"; reason: string };

/** log-sum-exp, so sums of many small powers do not underflow to zero. */
function logSumExp(logTerms: readonly number[]): number {
  let max = -Infinity;
  for (const t of logTerms) if (t > max) max = t;
  if (max === -Infinity) return -Infinity;
  let sum = 0;
  for (const t of logTerms) sum += Math.exp(t - max);
  return max + Math.log(sum);
}

/** Shannon entropy in nats. The alpha -> 1 limit of the Renyi family. */
function shannonNats(p: readonly number[]): number {
  let h = 0;
  for (const pi of p) {
    if (pi <= SUPPORT_EPSILON) continue; // 0 log 0 = 0
    h -= pi * Math.log(pi);
  }
  return h;
}

export interface EntropyOptions {
  /** Logarithm base. 2 gives bits (the default), "e" gives nats. */
  base?: 2 | "e";
  /**
   * Divide by log(support size) to land in [0, 1].
   *
   * Makes entropies comparable across distributions with different numbers of
   * outcomes, which raw entropy is not: a uniform distribution over 4 bins and one
   * over 1024 bins are both maximally uncertain, and only the normalised form says so.
   */
  normalized?: boolean;
}

/**
 * Renyi entropy of order alpha.
 *
 *   H_alpha(P) = (1 - alpha)^-1 log( sum_i p_i^alpha )
 *
 * Non-increasing in alpha, so H_0 >= H_1 >= H_2 >= H_inf always. That ordering is
 * a useful sanity check on any implementation, and it is tested.
 *
 * Special values are computed directly rather than through the general formula:
 * alpha = 0 counts the support (the sum is just the number of non-zero outcomes),
 * and alpha = infinity is set by the single largest probability.
 */
export function renyiEntropy(
  values: readonly number[],
  alpha: number,
  options: EntropyOptions = {},
): EntropyResult {
  if (!Number.isFinite(alpha) && alpha !== Infinity) {
    return { kind: "unavailable", reason: `alpha must be a finite number or Infinity, got ${alpha}` };
  }
  if (alpha < 0) {
    return { kind: "unavailable", reason: `alpha must be non-negative, got ${alpha}` };
  }

  const p = toDistribution(values);
  if (!p) {
    return {
      kind: "unavailable",
      reason: "input could not be normalized to a distribution (empty, negative, or all-zero)",
    };
  }

  const useBits = options.base !== "e";
  const support = p.filter((pi) => pi > SUPPORT_EPSILON).length;

  let nats: number;
  if (alpha === Infinity) {
    // Min-entropy: -log of the largest probability.
    nats = -Math.log(Math.max(...p));
  } else if (alpha === 0) {
    // Hartley / max-entropy: log of the number of outcomes with any support.
    nats = Math.log(support);
  } else if (Math.abs(alpha - 1) < ALPHA_LIMIT_TOLERANCE) {
    nats = shannonNats(p);
  } else {
    const logTerms: number[] = [];
    for (const pi of p) {
      if (pi <= SUPPORT_EPSILON) continue;
      logTerms.push(alpha * Math.log(pi));
    }
    if (logTerms.length === 0) {
      return { kind: "unavailable", reason: "distribution has no support" };
    }
    nats = logSumExp(logTerms) / (1 - alpha);
  }

  let value = useBits ? nats / Math.LN2 : nats;

  if (options.normalized) {
    if (support < 2) {
      return {
        kind: "unavailable",
        reason: `normalized entropy is undefined for a distribution supported on ${support} outcome(s); there is no range to normalize against`,
      };
    }
    const maxNats = Math.log(support);
    value = nats / maxNats;
  }

  // Entropy is non-negative; a small negative here is float error.
  return { kind: "value", value: Math.max(0, value), alpha, base: useBits ? "bits" : "nats" };
}

/**
 * Tsallis entropy of order q.
 *
 *   S_q(P) = (1 - sum_i p_i^q) / (q - 1)
 *
 * A different generalisation from Renyi's — the two share the sum of powers but
 * combine it differently, and they are related by a monotone transform, so they
 * order distributions identically while differing in scale.
 *
 * Included because Tsallis is non-additive: for independent systems the entropies
 * do not simply add, and the deficit is controlled by q. When that non-additivity
 * is the property being modelled, Renyi is the wrong tool and this is the right one.
 * When it is not, prefer Renyi, which is additive and bounded by log(support).
 */
export function tsallisEntropy(values: readonly number[], q: number): EntropyResult {
  if (!Number.isFinite(q)) {
    return { kind: "unavailable", reason: `q must be a finite number, got ${q}` };
  }
  if (q < 0) {
    return {
      kind: "unavailable",
      reason: `q must be non-negative, got ${q}; negative orders diverge when the distribution has zero-probability outcomes`,
    };
  }
  const p = toDistribution(values);
  if (!p) {
    return {
      kind: "unavailable",
      reason: "input could not be normalized to a distribution (empty, negative, or all-zero)",
    };
  }

  if (Math.abs(q - 1) < ALPHA_LIMIT_TOLERANCE) {
    // The q -> 1 limit is Shannon in nats.
    return { kind: "value", value: shannonNats(p), alpha: q, base: "nats" };
  }

  let sum = 0;
  for (const pi of p) {
    if (pi <= SUPPORT_EPSILON) continue;
    sum += pi ** q;
  }
  return { kind: "value", value: (1 - sum) / (q - 1), alpha: q, base: "nats" };
}

/**
 * Renyi divergence of order alpha.
 *
 *   D_alpha(P||Q) = (alpha - 1)^-1 log( sum_i p_i^alpha q_i^(1-alpha) )
 *
 * Reduces to KL at alpha = 1, and is non-decreasing in alpha.
 *
 * The support behaviour is the reason to reach for this, and it splits sharply at
 * alpha = 1:
 *
 *   alpha < 1   q_i is raised to a POSITIVE power, so a zero in the reference
 *               contributes zero and the divergence stays finite. Usable on a
 *               baseline with holes, with no smoothing constant to invent.
 *
 *   alpha > 1   q_i is raised to a NEGATIVE power, so a zero in the reference
 *               diverges exactly as KL does. Reported unavailable, with the
 *               offending outcomes named.
 *
 * Fully disjoint support is infinite at every alpha, which is correct: two
 * distributions that never produce the same outcome are perfectly distinguishable.
 */
export function renyiDivergence(
  observed: readonly number[],
  reference: readonly number[],
  alpha: number,
  options: { base?: 2 | "e" } = {},
): DivergenceResult {
  if (observed.length !== reference.length) {
    return {
      kind: "unavailable",
      reason: `distributions have different lengths (${observed.length} vs ${reference.length}); they do not describe the same outcome space`,
      supportMismatch: [],
      excludedMass: 0,
    };
  }
  if (!(alpha > 0) || !Number.isFinite(alpha)) {
    return {
      kind: "unavailable",
      reason: `alpha must be a finite positive number, got ${alpha}`,
      supportMismatch: [],
      excludedMass: 0,
    };
  }

  const p = toDistribution(observed);
  const q = toDistribution(reference);
  if (!p || !q) {
    return {
      kind: "unavailable",
      reason: "one or both inputs could not be normalized to a distribution (empty, negative, or all-zero)",
      supportMismatch: [],
      excludedMass: 0,
    };
  }

  const supportMismatch: number[] = [];
  let excludedMass = 0;
  for (let i = 0; i < p.length; i++) {
    if (q[i]! <= SUPPORT_EPSILON && p[i]! > SUPPORT_EPSILON) {
      supportMismatch.push(i);
      excludedMass += p[i]!;
    }
  }

  const useBits = options.base !== "e";

  if (Math.abs(alpha - 1) < ALPHA_LIMIT_TOLERANCE) {
    // At the limit this IS KL, support problem and all. Defer rather than
    // reimplement, so the two cannot drift apart.
    if (supportMismatch.length > 0) {
      return {
        kind: "unavailable",
        reason:
          `at alpha = 1 the Renyi divergence is the KL divergence, which is infinite here: the reference assigns zero to ${supportMismatch.length} outcome(s) carrying ${(excludedMass * 100).toFixed(2)}% of the observation's mass. ` +
          "Use alpha < 1, where the reference is raised to a positive power and the divergence stays finite without an invented smoothing constant.",
        supportMismatch,
        excludedMass,
      };
    }
    let sum = 0;
    for (let i = 0; i < p.length; i++) {
      const pi = p[i]!;
      if (pi <= SUPPORT_EPSILON) continue;
      sum += pi * Math.log(pi / q[i]!);
    }
    return {
      kind: "value",
      value: Math.max(0, useBits ? sum / Math.LN2 : sum),
      supportMismatch,
      excludedMass,
      policy: "strict",
      alpha,
      base: useBits ? "bits" : "nats",
    };
  }

  if (alpha > 1 && supportMismatch.length > 0) {
    return {
      kind: "unavailable",
      reason:
        `for alpha > 1 the reference is raised to the negative power ${(1 - alpha).toFixed(3)}, so the ${supportMismatch.length} outcome(s) where the reference is zero make the divergence infinite. ` +
        "This is the same failure KL has, and it is the correct answer. Use alpha < 1 for a finite result on a baseline with holes.",
      supportMismatch,
      excludedMass,
    };
  }

  // sum_i p^alpha q^(1-alpha), accumulated in the log domain.
  const logTerms: number[] = [];
  for (let i = 0; i < p.length; i++) {
    const pi = p[i]!;
    const qi = q[i]!;
    if (pi <= SUPPORT_EPSILON) continue;
    // For alpha < 1 a zero reference contributes q^positive = 0, i.e. log = -inf,
    // which log-sum-exp drops. Skipping it is the same thing, done cheaply.
    if (qi <= SUPPORT_EPSILON) continue;
    logTerms.push(alpha * Math.log(pi) + (1 - alpha) * Math.log(qi));
  }

  if (logTerms.length === 0) {
    return {
      kind: "unavailable",
      reason:
        "the distributions have no outcome in common, so they are perfectly distinguishable and every Renyi divergence is infinite",
      supportMismatch,
      excludedMass,
    };
  }

  const nats = logSumExp(logTerms) / (alpha - 1);
  return {
    kind: "value",
    value: Math.max(0, useBits ? nats / Math.LN2 : nats),
    supportMismatch,
    excludedMass,
    policy: "strict",
    alpha,
    base: useBits ? "bits" : "nats",
  };
}

/**
 * Hellinger distance, a bounded metric on distributions.
 *
 *   H(P,Q) = sqrt( 1 - sum_i sqrt(p_i q_i) )
 *
 * Related to the Renyi divergence at alpha = 1/2 by a monotone transform. Always
 * finite, always in [0, 1], and a true metric — so like the Jensen-Shannon
 * distance it is safe for clustering, and unlike KL it needs no support policy.
 *
 * Worth having alongside JS distance because the two weight disagreement
 * differently: Hellinger is driven by the geometric mean of the two densities and
 * is the more sensitive of the pair where both assign small probabilities.
 */
export function hellingerDistance(
  a: readonly number[],
  b: readonly number[],
): { kind: "value"; value: number } | { kind: "unavailable"; reason: string } {
  if (a.length !== b.length) {
    return {
      kind: "unavailable",
      reason: `distributions have different lengths (${a.length} vs ${b.length}); they do not describe the same outcome space`,
    };
  }
  const p = toDistribution(a);
  const q = toDistribution(b);
  if (!p || !q) {
    return {
      kind: "unavailable",
      reason: "one or both inputs could not be normalized to a distribution (empty, negative, or all-zero)",
    };
  }

  // The Bhattacharyya coefficient: 1 when identical, 0 when disjoint.
  let bhattacharyya = 0;
  for (let i = 0; i < p.length; i++) bhattacharyya += Math.sqrt(p[i]! * q[i]!);

  return { kind: "value", value: Math.sqrt(Math.max(0, 1 - Math.min(1, bhattacharyya))) };
}

/**
 * The Renyi entropy spectrum: H_alpha sampled across a range of alpha.
 *
 * The shape of this curve says more than any single entropy does. A flat spectrum
 * means the distribution is close to uniform over its support. A steeply falling
 * one means a few outcomes dominate, and the alpha at which it falls says how few.
 *
 * Useful as a regime fingerprint precisely because it separates "the tail changed"
 * from "the mode changed", which a single Shannon number folds together.
 */
export function renyiSpectrum(
  values: readonly number[],
  alphas: readonly number[] = [0, 0.5, 1, 2, 4, Infinity],
  options: EntropyOptions = {},
): { alpha: number; entropy: EntropyResult }[] {
  return alphas.map((alpha) => ({ alpha, entropy: renyiEntropy(values, alpha, options) }));
}
