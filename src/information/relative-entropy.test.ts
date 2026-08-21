import { describe, expect, it } from "vitest";
import {
  jensenShannonDistance,
  jensenShannonDivergence,
  regimeDisplacement,
  relativeEntropy,
  toDistribution,
} from "./relative-entropy.js";

const uniform4 = [0.25, 0.25, 0.25, 0.25];
const peaked4 = [0.7, 0.1, 0.1, 0.1];

describe("toDistribution", () => {
  it("normalizes counts", () => {
    expect(toDistribution([1, 1, 1, 1])).toEqual(uniform4);
    expect(toDistribution([2, 6])).toEqual([0.25, 0.75]);
  });

  it("refuses inputs for which no distribution exists", () => {
    // Inventing a uniform distribution here would answer a different question
    // than the caller asked.
    expect(toDistribution([])).toBeNull();
    expect(toDistribution([0, 0, 0])).toBeNull();
    expect(toDistribution([1, -1])).toBeNull();
    expect(toDistribution([1, NaN])).toBeNull();
  });
});

describe("relative entropy", () => {
  it("is zero for identical distributions", () => {
    const d = relativeEntropy(uniform4, uniform4);
    if (d.kind !== "value") throw new Error(d.reason);
    expect(d.value).toBeCloseTo(0, 12);
  });

  it("matches a hand-computed value", () => {
    // P = [1/2, 1/2], Q = [1/4, 3/4]
    // D = 0.5*log2(2) + 0.5*log2(2/3)
    //   = 0.5 + 0.5*(1 - log2 3)
    //   = 1 - 0.5*log2 3
    //   ~= 0.20752
    const d = relativeEntropy([0.5, 0.5], [0.25, 0.75]);
    if (d.kind !== "value") throw new Error(d.reason);
    expect(d.value).toBeCloseTo(1 - 0.5 * Math.log2(3), 10);
    expect(d.value).toBeCloseTo(0.20751874963942185, 10);
  });

  it("is asymmetric", () => {
    const forward = relativeEntropy(peaked4, uniform4);
    const reverse = relativeEntropy(uniform4, peaked4);
    if (forward.kind !== "value" || reverse.kind !== "value") throw new Error("expected both");
    expect(forward.value).not.toBeCloseTo(reverse.value, 4);
  });

  it("reports nats when asked", () => {
    const bits = relativeEntropy([0.5, 0.5], [0.25, 0.75]);
    const nats = relativeEntropy([0.5, 0.5], [0.25, 0.75], { base: "e" });
    if (bits.kind !== "value" || nats.kind !== "value") throw new Error("expected both");
    expect(bits.value).toBeCloseTo(nats.value / Math.LN2, 10);
    expect(nats.base).toBe("nats");
  });
});

describe("the support problem is reported, not smoothed away", () => {
  const observed = [0.5, 0.5];
  const referenceWithHole = [1, 0];

  it("declines by default and explains why", () => {
    const d = relativeEntropy(observed, referenceWithHole);
    expect(d.kind).toBe("unavailable");
    if (d.kind !== "unavailable") return;
    expect(d.reason).toMatch(/infinite/);
    expect(d.reason).toMatch(/stronger statement than considering them unlikely/);
    expect(d.supportMismatch).toEqual([1]);
    expect(d.excludedMass).toBeCloseTo(0.5, 10);
  });

  it("gives a finite answer under smoothing, and records the constant", () => {
    const d = relativeEntropy(observed, referenceWithHole, { policy: "smooth", alpha: 0.5 });
    if (d.kind !== "value") throw new Error(d.reason);
    expect(Number.isFinite(d.value)).toBe(true);
    expect(d.policy).toBe("smooth");
    expect(d.alpha).toBe(0.5);
    // The mismatch is still reported: the answer is finite because of a choice,
    // and the choice is visible.
    expect(d.supportMismatch).toEqual([1]);
  });

  it("gives a different answer for a different alpha, which is why alpha is recorded", () => {
    const a = relativeEntropy(observed, referenceWithHole, { policy: "smooth", alpha: 0.5 });
    const b = relativeEntropy(observed, referenceWithHole, { policy: "smooth", alpha: 0.01 });
    if (a.kind !== "value" || b.kind !== "value") throw new Error("expected both");
    // Two numbers that are not comparable to each other, from the same inputs.
    expect(a.value).not.toBeCloseTo(b.value, 2);
  });

  it("restricts to the shared support and reports what was dropped", () => {
    const d = relativeEntropy(observed, referenceWithHole, { policy: "restrict" });
    if (d.kind !== "value") throw new Error(d.reason);
    // Only bin 0 survives; both restrict to a point mass, so the divergence is 0.
    expect(d.value).toBeCloseTo(0, 10);
    expect(d.excludedMass).toBeCloseTo(0.5, 10);
  });

  it("rejects mismatched lengths rather than padding", () => {
    const d = relativeEntropy([0.5, 0.5], [1 / 3, 1 / 3, 1 / 3]);
    expect(d.kind).toBe("unavailable");
    if (d.kind !== "unavailable") return;
    expect(d.reason).toMatch(/different lengths/);
  });
});

describe("Jensen-Shannon divergence", () => {
  it("is ZERO for identical distributions", () => {
    // The property a shipped implementation elsewhere in this repo gets wrong:
    // it returns H(p) instead of 0, because it averages cross-entropies to the
    // mixture rather than KL divergences to it. That makes a self-comparison
    // score higher than a genuine difference, inverting the metric.
    const d = jensenShannonDivergence(uniform4, uniform4);
    if (d.kind !== "value") throw new Error(d.reason);
    expect(d.value).toBeCloseTo(0, 12);
  });

  it("scores different distributions above identical ones", () => {
    const same = jensenShannonDivergence(uniform4, uniform4);
    const different = jensenShannonDivergence(uniform4, peaked4);
    if (same.kind !== "value" || different.kind !== "value") throw new Error("expected both");
    expect(different.value).toBeGreaterThan(same.value);
  });

  it("is symmetric", () => {
    const forward = jensenShannonDivergence(uniform4, peaked4);
    const reverse = jensenShannonDivergence(peaked4, uniform4);
    if (forward.kind !== "value" || reverse.kind !== "value") throw new Error("expected both");
    expect(forward.value).toBeCloseTo(reverse.value, 12);
  });

  it("is bounded by 1 bit and reaches it for disjoint support", () => {
    const d = jensenShannonDivergence([1, 0], [0, 1]);
    if (d.kind !== "value") throw new Error(d.reason);
    expect(d.value).toBeCloseTo(1, 10);
  });

  it("handles disjoint support without a policy, unlike KL", () => {
    // The mixture has support wherever either input does, so the problem that
    // makes KL infinite cannot arise here.
    const kl = relativeEntropy([1, 0], [0, 1]);
    const jsd = jensenShannonDivergence([1, 0], [0, 1]);
    expect(kl.kind).toBe("unavailable");
    expect(jsd.kind).toBe("value");
  });
});

describe("Jensen-Shannon distance is a metric", () => {
  const dist = (x: number[], y: number[]) => {
    const r = jensenShannonDistance(x, y);
    if (r.kind !== "value") throw new Error(r.reason);
    return r.value;
  };
  const div = (x: number[], y: number[]) => {
    const r = jensenShannonDivergence(x, y);
    if (r.kind !== "value") throw new Error(r.reason);
    return r.value;
  };

  it("satisfies the triangle inequality where the divergence does not", () => {
    // The two endpoints of a 2-simplex with their midpoint. The divergence puts
    // the endpoints a full bit apart while each is only 0.311 from the midpoint,
    // so 1 > 0.622 and the inequality fails. Taking the root repairs it exactly:
    // 1 <= 1.116. This is why clustering and nearest-neighbour work must use the
    // root, and it is the whole practical difference between the two functions.
    const a = [1, 0];
    const b = [0.5, 0.5];
    const c = [0, 1];

    expect(div(a, c)).toBeGreaterThan(div(a, b) + div(b, c));
    expect(dist(a, c)).toBeLessThanOrEqual(dist(a, b) + dist(b, c) + 1e-12);
  });

  it("obeys the triangle inequality across many random triples", () => {
    // A single counterexample proves the divergence is not a metric. Only a sweep
    // gives any confidence the distance is one.
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const randomDist = (n: number) => Array.from({ length: n }, () => rand() + 1e-3);

    for (let trial = 0; trial < 400; trial++) {
      const n = 2 + (trial % 6);
      const x = randomDist(n);
      const y = randomDist(n);
      const z = randomDist(n);
      expect(dist(x, z)).toBeLessThanOrEqual(dist(x, y) + dist(y, z) + 1e-9);
    }
  });

  it("is zero only for identical distributions", () => {
    const same = jensenShannonDistance(peaked4, peaked4);
    if (same.kind !== "value") throw new Error(same.reason);
    expect(same.value).toBeCloseTo(0, 12);
  });
});

describe("regime displacement", () => {
  it("reports both a distance and a surprise", () => {
    const current = [0.4, 0.3, 0.2, 0.1];
    const baseline = [0.25, 0.25, 0.25, 0.25];
    const d = regimeDisplacement(current, baseline);

    expect(d.distance.kind).toBe("value");
    expect(d.surprise.kind).toBe("value");
    expect(d.novelOutcomes).toEqual([]);
    expect(d.novelMass).toBe(0);
  });

  it("keeps a distance but withholds surprise when the regime is genuinely novel", () => {
    // The informative case. The current state visits an outcome the baseline
    // never saw, so a bounded distance is still meaningful while the asymmetric
    // surprise is honestly infinite.
    const current = [0.3, 0.3, 0.4];
    const baseline = [0.5, 0.5, 0];
    const d = regimeDisplacement(current, baseline);

    expect(d.distance.kind).toBe("value");
    expect(d.surprise.kind).toBe("unavailable");
    expect(d.novelOutcomes).toEqual([2]);
    expect(d.novelMass).toBeCloseTo(0.4, 10);
  });

  it("grows monotonically as the current state moves away", () => {
    const baseline = [0.25, 0.25, 0.25, 0.25];
    const near = [0.3, 0.25, 0.25, 0.2];
    const far = [0.85, 0.05, 0.05, 0.05];

    const d = (p: number[]) => {
      const r = regimeDisplacement(p, baseline).distance;
      if (r.kind !== "value") throw new Error(r.reason);
      return r.value;
    };
    expect(d(near)).toBeLessThan(d(far));
    expect(d(baseline)).toBeCloseTo(0, 12);
  });
});
