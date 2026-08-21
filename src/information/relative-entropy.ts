/**
 * Classical relative-entropy primitives: how distinguishable is this state from a
 * reference state?
 *
 * This is a deliberately narrow module, and the narrowness is the point.
 *
 * The package already answers two questions — "how much structure is there?"
 * (spectral negentropy / coherence density) and "does it persist?" (structural
 * persistence). It has not had a way to ask the third: **how far has the current
 * distribution moved from a baseline?** Absolute structure and displacement are
 * different questions, and a regime can hold its entropy constant while moving
 * somewhere else entirely.
 *
 * ---
 *
 * ON WHAT THIS IS NOT.
 *
 * These are the Kullback-Leibler and Jensen-Shannon divergences between ordinary
 * probability vectors. They are the *classical* cousins of the Araki-Uhlmann
 * relative entropy that appears in algebraic QFT and in recent work deriving
 * semiclassical gravity from horizon information flux.
 *
 * They share a name and a motivation. They are not the same object. Araki-Uhlmann
 * relative entropy is defined via Tomita-Takesaki modular theory on a von Neumann
 * algebra, precisely because local QFT algebras are Type III and admit no density
 * matrix at all. Nothing in this file operates on an algebra, a modular operator,
 * or a field. It operates on arrays of non-negative numbers that sum to one.
 *
 * This note exists because the failure mode is specific and predictable: a module
 * named for relative entropy, sitting in a package that also ships spherical
 * harmonics and attractors, will eventually be read as a claim that an FFT over a
 * time series measures something about spacetime. It does not. If genuine
 * finite-dimensional quantum-information models are ever wanted, they belong in an
 * explicitly experimental namespace, labelled as finite-dimensional models rather
 * than as the QFT objects they are named after.
 *
 * ---
 *
 * ON THE SUPPORT PROBLEM, which is the only hard part.
 *
 * D(P||Q) is infinite when Q assigns zero to an outcome P assigns mass to. That
 * infinity is not a numerical nuisance to be smoothed away — it is the correct
 * answer to a real question. "The baseline never observed this at all" is a
 * different statement from "the baseline considers this unlikely", and a library
 * that silently substitutes 1e-10 destroys the difference and returns a large
 * finite number whose magnitude is an artifact of the constant chosen.
 *
 * So support mismatch is reported, never hidden. The caller chooses a policy and
 * the policy is recorded in the result, because a divergence computed under
 * additive smoothing is not comparable to one computed without it.
 */

/** Below this, a probability is treated as zero. */
const SUPPORT_EPSILON = 1e-12;

/**
 * What to do when the reference assigns zero mass where the observation does not.
 *
 * - `strict`     — report the divergence as unavailable, naming the offending
 *                  bins. The honest default: the answer is genuinely infinite.
 * - `smooth`     — additive (Laplace) smoothing of both vectors by `alpha`, which
 *                  makes the result finite and comparable ONLY to other results
 *                  computed with the same alpha.
 * - `restrict`   — compute over the shared support only, and report how much of
 *                  P's mass was excluded. Useful when the reference is known to be
 *                  under-sampled rather than genuinely zero.
 */
export type SupportPolicy = "strict" | "smooth" | "restrict";

export interface DivergenceOptions {
  policy?: SupportPolicy;
  /** Additive smoothing constant for `smooth`. Recorded in the result. */
  alpha?: number;
  /** Logarithm base. 2 gives bits and bounds JSD to [0, 1]; "e" gives nats. */
  base?: 2 | "e";
}

export type DivergenceResult =
  | {
      kind: "value";
      value: number;
      /** Bins where the reference was zero and the observation was not. */
      supportMismatch: number[];
      /** Fraction of P's mass on mismatched bins. 0 when support is contained. */
      excludedMass: number;
      policy: SupportPolicy;
      alpha: number;
      base: "bits" | "nats";
    }
  | {
      kind: "unavailable";
      reason: string;
      supportMismatch: number[];
      excludedMass: number;
    };

/**
 * Normalize a non-negative vector to sum to one.
 *
 * Returns null for a vector that is empty, contains a negative, or sums to zero —
 * all three are inputs for which no probability distribution exists, and inventing
 * a uniform one would silently answer a different question than the one asked.
 */
export function toDistribution(values: readonly number[]): number[] | null {
  if (values.length === 0) return null;
  let total = 0;
  for (const v of values) {
    if (!Number.isFinite(v) || v < 0) return null;
    total += v;
  }
  if (!(total > 0)) return null;
  return values.map((v) => v / total);
}

interface Prepared {
  p: number[];
  q: number[];
  supportMismatch: number[];
  excludedMass: number;
}

function prepare(
  observed: readonly number[],
  reference: readonly number[],
  policy: SupportPolicy,
  alpha: number,
): { ok: true; prepared: Prepared } | { ok: false; reason: string; mismatch: number[]; mass: number } {
  if (observed.length !== reference.length) {
    return {
      ok: false,
      reason: `distributions have different lengths (${observed.length} vs ${reference.length}); they do not describe the same outcome space`,
      mismatch: [],
      mass: 0,
    };
  }

  let p = toDistribution(observed);
  let q = toDistribution(reference);
  if (!p || !q) {
    return {
      ok: false,
      reason: "one or both inputs could not be normalized to a distribution (empty, negative, or all-zero)",
      mismatch: [],
      mass: 0,
    };
  }

  // Find the bins where the reference has no support but the observation does.
  const supportMismatch: number[] = [];
  let excludedMass = 0;
  for (let i = 0; i < p.length; i++) {
    if (q[i]! <= SUPPORT_EPSILON && p[i]! > SUPPORT_EPSILON) {
      supportMismatch.push(i);
      excludedMass += p[i]!;
    }
  }

  if (supportMismatch.length > 0) {
    if (policy === "strict") {
      return {
        ok: false,
        reason:
          `the reference assigns zero probability to ${supportMismatch.length} outcome(s) carrying ${(excludedMass * 100).toFixed(2)}% of the observation's mass, so the divergence is infinite. ` +
          "This is the correct answer, not a numerical problem: the baseline never observed these outcomes, which is a stronger statement than considering them unlikely. Choose `smooth` or `restrict` to obtain a finite number, and record which.",
        mismatch: supportMismatch,
        mass: excludedMass,
      };
    }
    if (policy === "smooth") {
      const n = p.length;
      const smoothed = (d: number[]) => {
        const total = 1 + alpha * n;
        return d.map((v) => (v + alpha) / total);
      };
      p = smoothed(p);
      q = smoothed(q);
    } else {
      // restrict: drop the mismatched bins and renormalize what remains.
      const keep: number[] = [];
      for (let i = 0; i < p.length; i++) if (!supportMismatch.includes(i)) keep.push(i);
      const pk = toDistribution(keep.map((i) => p![i]!));
      const qk = toDistribution(keep.map((i) => q![i]!));
      if (!pk || !qk) {
        return {
          ok: false,
          reason: "restricting to the shared support left no mass in one of the distributions",
          mismatch: supportMismatch,
          mass: excludedMass,
        };
      }
      p = pk;
      q = qk;
    }
  }

  return { ok: true, prepared: { p, q, supportMismatch, excludedMass } };
}

/**
 * Kullback-Leibler divergence D(P||Q), in bits by default.
 *
 * Asymmetric on purpose: D(P||Q) asks how surprised a model expecting Q is by
 * data drawn from P. Swapping the arguments asks a different question, and for
 * regime work the observation belongs first and the baseline second.
 *
 * Not a metric. It does not satisfy the triangle inequality and it is not
 * symmetric, so it must not be used as a distance for clustering or
 * nearest-neighbour retrieval. Use `jensenShannonDistance` for that.
 */
export function relativeEntropy(
  observed: readonly number[],
  reference: readonly number[],
  options: DivergenceOptions = {},
): DivergenceResult {
  const policy = options.policy ?? "strict";
  const alpha = options.alpha ?? 0.5;
  const useBits = options.base !== "e";

  const result = prepare(observed, reference, policy, alpha);
  if (!result.ok) {
    return {
      kind: "unavailable",
      reason: result.reason,
      supportMismatch: result.mismatch,
      excludedMass: result.mass,
    };
  }

  const { p, q, supportMismatch, excludedMass } = result.prepared;
  let sum = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i]!;
    if (pi <= SUPPORT_EPSILON) continue; // 0 log 0 = 0, by the usual convention
    sum += pi * Math.log(pi / q[i]!);
  }
  const value = useBits ? sum / Math.LN2 : sum;

  return {
    kind: "value",
    // Clamp at zero: KL is non-negative, and a tiny negative here is float error.
    value: Math.max(0, value),
    supportMismatch,
    excludedMass,
    policy,
    alpha,
    base: useBits ? "bits" : "nats",
  };
}

/**
 * Jensen-Shannon divergence: symmetric, always finite, bounded to [0, 1] in bits.
 *
 * JSD(P||Q) = ½ D(P||M) + ½ D(Q||M) with M = (P+Q)/2.
 *
 * The mixture M has support wherever either input does, so the support problem
 * cannot arise and no policy is needed — which is why this, not KL, is the right
 * default for comparing two observed distributions.
 *
 * Worth stating explicitly because the error is easy and was found in a shipped
 * implementation elsewhere in this repo: JSD is built from KL divergences to the
 * mixture, NOT from cross-entropies to the mixture. Cross-entropy H(P,M) equals
 * H(P) + D(P||M), so averaging cross-entropies yields ½[H(P)+H(Q)] + JSD — a
 * quantity that does not vanish when P equals Q and instead returns the entropy.
 * A self-comparison scoring higher than a genuine difference inverts the metric.
 */
export function jensenShannonDivergence(
  a: readonly number[],
  b: readonly number[],
  options: { base?: 2 | "e" } = {},
): DivergenceResult {
  if (a.length !== b.length) {
    return {
      kind: "unavailable",
      reason: `distributions have different lengths (${a.length} vs ${b.length}); they do not describe the same outcome space`,
      supportMismatch: [],
      excludedMass: 0,
    };
  }
  const p = toDistribution(a);
  const q = toDistribution(b);
  if (!p || !q) {
    return {
      kind: "unavailable",
      reason: "one or both inputs could not be normalized to a distribution (empty, negative, or all-zero)",
      supportMismatch: [],
      excludedMass: 0,
    };
  }

  const useBits = options.base !== "e";
  const m = p.map((pi, i) => (pi + q[i]!) / 2);

  const kl = (from: number[]): number => {
    let sum = 0;
    for (let i = 0; i < from.length; i++) {
      const v = from[i]!;
      if (v <= SUPPORT_EPSILON) continue;
      // m[i] >= v/2 > 0 wherever v > 0, so this never divides by zero.
      sum += v * Math.log(v / m[i]!);
    }
    return sum;
  };

  const nats = 0.5 * kl(p) + 0.5 * kl(q);
  const value = useBits ? nats / Math.LN2 : nats;

  return {
    kind: "value",
    // Bounded by log2(2) = 1 bit; clamp both ends against float error.
    value: Math.min(useBits ? 1 : Math.LN2, Math.max(0, value)),
    supportMismatch: [],
    excludedMass: 0,
    policy: "strict",
    alpha: 0,
    base: useBits ? "bits" : "nats",
  };
}

/**
 * Jensen-Shannon distance: the square root of the divergence.
 *
 * Unlike the divergence itself, this satisfies the triangle inequality and is a
 * true metric, which is what makes it — and not KL — safe to use for clustering,
 * nearest-neighbour retrieval, or anything that assumes a metric space.
 */
export function jensenShannonDistance(
  a: readonly number[],
  b: readonly number[],
  options: { base?: 2 | "e" } = {},
): DivergenceResult {
  const divergence = jensenShannonDivergence(a, b, options);
  if (divergence.kind !== "value") return divergence;
  return { ...divergence, value: Math.sqrt(divergence.value) };
}

export interface RegimeDisplacement {
  /** Symmetric, bounded, metric. The headline number. */
  distance: DivergenceResult;
  /** Asymmetric surprise of the baseline at the current state. */
  surprise: DivergenceResult;
  /**
   * Whether the current distribution visits outcomes the baseline never did.
   *
   * Reported separately because it is qualitatively different from a large
   * divergence: the regime is not merely displaced, it is somewhere the reference
   * period has no information about at all.
   */
  novelOutcomes: number[];
  novelMass: number;
}

/**
 * Displacement of a current distribution from a baseline.
 *
 * Returns both directions deliberately. The symmetric distance is the one to
 * threshold, cluster or trend on. The asymmetric surprise answers a different and
 * often more actionable question — how badly a model fitted to the baseline would
 * be caught out by the present — and it is the one that goes unavailable when the
 * present has moved outside what the baseline ever saw.
 *
 * That `unavailable` is the informative case. A regime that has entered
 * genuinely novel territory should not be summarised by a large finite number
 * that looks like a slightly worse version of yesterday.
 */
export function regimeDisplacement(
  current: readonly number[],
  baseline: readonly number[],
  options: DivergenceOptions = {},
): RegimeDisplacement {
  const distance = jensenShannonDistance(current, baseline, {
    ...(options.base === "e" ? { base: "e" as const } : {}),
  });
  const surprise = relativeEntropy(current, baseline, options);

  const novelOutcomes = surprise.kind === "unavailable" ? surprise.supportMismatch : surprise.supportMismatch;
  const novelMass = surprise.excludedMass;

  return { distance, surprise, novelOutcomes, novelMass };
}
