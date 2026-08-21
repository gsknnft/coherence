import { describe, expect, it } from "vitest";
import {
  hellingerDistance,
  renyiDivergence,
  renyiEntropy,
  renyiSpectrum,
  tsallisEntropy,
} from "./renyi.js";
import { relativeEntropy } from "./relative-entropy.js";

const uniform4 = [0.25, 0.25, 0.25, 0.25];
const peaked = [0.7, 0.2, 0.05, 0.05];
const val = (r: ReturnType<typeof renyiEntropy>) => {
  if (r.kind !== "value") throw new Error(r.reason);
  return r.value;
};

describe("Renyi entropy special values", () => {
  it("equals log2(n) for a uniform distribution at every alpha", () => {
    // The defining property: uniform is maximally uncertain no matter which part
    // of the distribution alpha emphasises, because every part is the same.
    for (const alpha of [0, 0.5, 1, 2, 8, Infinity]) {
      expect(val(renyiEntropy(uniform4, alpha))).toBeCloseTo(2, 10);
    }
  });

  it("reduces to Shannon at alpha = 1", () => {
    const shannon = -peaked.reduce((s, p) => s + p * Math.log2(p), 0);
    expect(val(renyiEntropy(peaked, 1))).toBeCloseTo(shannon, 10);
  });

  it("approaches Shannon continuously from both sides", () => {
    // The formula is 0/0 at exactly 1, so the limit is substituted there. This
    // checks the substitution is the genuine limit and not a discontinuity.
    //
    // Tested as a RATE rather than against a fixed tolerance, because H_alpha has
    // a non-zero derivative at 1 (it is -Var(log p)/2), so the gap is linear in
    // the offset and any single tolerance is a guess about the distribution. If
    // the offset shrinks by ten and the gap shrinks by ten, the function is
    // continuous and differentiable at 1 — which is the actual claim.
    const at1 = val(renyiEntropy(peaked, 1));
    const gapAt = (offset: number) =>
      Math.max(
        Math.abs(val(renyiEntropy(peaked, 1 - offset)) - at1),
        Math.abs(val(renyiEntropy(peaked, 1 + offset)) - at1),
      );

    const coarse = gapAt(1e-3);
    const fine = gapAt(1e-4);
    const finer = gapAt(1e-5);

    expect(coarse).toBeLessThan(1e-2);
    // Linear convergence: each tenfold reduction in offset cuts the gap tenfold.
    expect(coarse / fine).toBeGreaterThan(8);
    expect(fine / finer).toBeGreaterThan(8);
  });

  it("is log2(support) at alpha = 0, ignoring probabilities entirely", () => {
    expect(val(renyiEntropy([0.97, 0.01, 0.01, 0.01], 0))).toBeCloseTo(2, 10);
    // Only the count of non-zero outcomes matters, so a wildly skewed
    // distribution and a uniform one over the same support agree here.
    expect(val(renyiEntropy(uniform4, 0))).toBeCloseTo(2, 10);
    expect(val(renyiEntropy([0.5, 0.5, 0, 0], 0))).toBeCloseTo(1, 10);
  });

  it("is the collision entropy at alpha = 2", () => {
    const collision = -Math.log2(peaked.reduce((s, p) => s + p * p, 0));
    expect(val(renyiEntropy(peaked, 2))).toBeCloseTo(collision, 10);
  });

  it("is the min-entropy at alpha = infinity", () => {
    expect(val(renyiEntropy(peaked, Infinity))).toBeCloseTo(-Math.log2(0.7), 10);
  });

  it("is non-increasing in alpha", () => {
    // H_0 >= H_0.5 >= H_1 >= H_2 >= H_inf. A monotonicity that any correct
    // implementation satisfies and a subtly wrong one usually does not.
    const alphas = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 4, 16, Infinity];
    let previous = Infinity;
    for (const alpha of alphas) {
      const h = val(renyiEntropy(peaked, alpha));
      expect(h).toBeLessThanOrEqual(previous + 1e-9);
      previous = h;
    }
  });

  it("normalizes to 1 for uniform and below 1 otherwise", () => {
    expect(val(renyiEntropy(uniform4, 1, { normalized: true }))).toBeCloseTo(1, 10);
    expect(val(renyiEntropy(peaked, 1, { normalized: true }))).toBeLessThan(1);
  });

  it("declines to normalize a point mass", () => {
    // There is no range to normalize against, and returning 0 or 1 would both be
    // defensible-looking answers to a question that has none.
    const r = renyiEntropy([1, 0, 0], 1, { normalized: true });
    expect(r.kind).toBe("unavailable");
    if (r.kind !== "unavailable") return;
    expect(r.reason).toMatch(/no range to normalize/);
  });

  it("rejects a negative alpha", () => {
    expect(renyiEntropy(peaked, -1).kind).toBe("unavailable");
  });
});

describe("Tsallis entropy", () => {
  it("reduces to Shannon in nats at q = 1", () => {
    const shannonNats = -peaked.reduce((s, p) => s + p * Math.log(p), 0);
    const r = tsallisEntropy(peaked, 1);
    if (r.kind !== "value") throw new Error(r.reason);
    expect(r.value).toBeCloseTo(shannonNats, 10);
  });

  it("orders distributions the same way Renyi does", () => {
    // The two are related by a monotone transform, so they must agree on which of
    // two distributions is more uncertain even though the scales differ.
    const q = 2;
    const tsallis = (p: number[]) => {
      const r = tsallisEntropy(p, q);
      if (r.kind !== "value") throw new Error(r.reason);
      return r.value;
    };
    expect(tsallis(uniform4)).toBeGreaterThan(tsallis(peaked));
    expect(val(renyiEntropy(uniform4, q))).toBeGreaterThan(val(renyiEntropy(peaked, q)));
  });

  it("rejects negative orders instead of hiding divergence at zero-mass outcomes", () => {
    expect(tsallisEntropy([0.5, 0.5, 0], -1).kind).toBe("unavailable");
  });
});

describe("Renyi divergence", () => {
  const dval = (r: ReturnType<typeof renyiDivergence>) => {
    if (r.kind !== "value") throw new Error(r.reason);
    return r.value;
  };

  it("is zero for identical distributions at every alpha", () => {
    for (const alpha of [0.25, 0.5, 1, 2, 8]) {
      expect(dval(renyiDivergence(peaked, peaked, alpha))).toBeCloseTo(0, 10);
    }
  });

  it("reduces to KL at alpha = 1", () => {
    const kl = relativeEntropy(peaked, uniform4);
    if (kl.kind !== "value") throw new Error(kl.reason);
    expect(dval(renyiDivergence(peaked, uniform4, 1))).toBeCloseTo(kl.value, 10);
  });

  it("is non-decreasing in alpha", () => {
    let previous = -Infinity;
    for (const alpha of [0.25, 0.5, 1, 2, 4, 8]) {
      const d = dval(renyiDivergence(peaked, uniform4, alpha));
      expect(d).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = d;
    }
  });

  it("STAYS FINITE below alpha = 1 when the reference has holes", () => {
    // The practical payoff of the whole family. KL is infinite here; alpha < 1
    // raises the reference to a positive power, so a zero contributes zero.
    const observed = [0.5, 0.3, 0.2];
    const referenceWithHole = [0.6, 0.4, 0];

    expect(relativeEntropy(observed, referenceWithHole).kind).toBe("unavailable");

    const d = renyiDivergence(observed, referenceWithHole, 0.5);
    expect(d.kind).toBe("value");
    if (d.kind !== "value") return;
    expect(Number.isFinite(d.value)).toBe(true);
    // The mismatch is still reported — finite does not mean unremarkable.
    expect(d.supportMismatch).toEqual([2]);
    expect(d.excludedMass).toBeCloseTo(0.2, 10);
  });

  it("diverges above alpha = 1 when the reference has holes, and says why", () => {
    const d = renyiDivergence([0.5, 0.3, 0.2], [0.6, 0.4, 0], 2);
    expect(d.kind).toBe("unavailable");
    if (d.kind !== "unavailable") return;
    expect(d.reason).toMatch(/negative power/);
    expect(d.reason).toMatch(/Use alpha < 1/);
  });

  it("is infinite at every alpha for disjoint support", () => {
    // Correct: distributions that never produce the same outcome are perfectly
    // distinguishable, and no choice of alpha should paper over that.
    for (const alpha of [0.5, 1, 2]) {
      const d = renyiDivergence([1, 0], [0, 1], alpha);
      expect(d.kind).toBe("unavailable");
    }
  });
});

describe("Hellinger distance", () => {
  const hval = (r: ReturnType<typeof hellingerDistance>) => {
    if (r.kind !== "value") throw new Error(r.reason);
    return r.value;
  };

  it("is zero for identical and one for disjoint distributions", () => {
    expect(hval(hellingerDistance(peaked, peaked))).toBeCloseTo(0, 10);
    expect(hval(hellingerDistance([1, 0], [0, 1]))).toBeCloseTo(1, 10);
  });

  it("is symmetric and bounded", () => {
    const forward = hval(hellingerDistance(peaked, uniform4));
    const reverse = hval(hellingerDistance(uniform4, peaked));
    expect(forward).toBeCloseTo(reverse, 12);
    expect(forward).toBeGreaterThan(0);
    expect(forward).toBeLessThanOrEqual(1);
  });

  it("stays finite where KL does not", () => {
    expect(relativeEntropy([0.5, 0.5], [1, 0]).kind).toBe("unavailable");
    expect(hellingerDistance([0.5, 0.5], [1, 0]).kind).toBe("value");
  });

  it("obeys the triangle inequality across random triples", () => {
    let seed = 987;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let trial = 0; trial < 300; trial++) {
      const n = 2 + (trial % 5);
      const make = () => Array.from({ length: n }, () => rand() + 1e-3);
      const x = make();
      const y = make();
      const z = make();
      expect(hval(hellingerDistance(x, z))).toBeLessThanOrEqual(
        hval(hellingerDistance(x, y)) + hval(hellingerDistance(y, z)) + 1e-9,
      );
    }
  });
});

describe("Renyi spectrum", () => {
  it("is flat for a uniform distribution and falls for a peaked one", () => {
    // The shape is the fingerprint: flat means uniform over its support, falling
    // means a few outcomes dominate, and where it falls says how few.
    const flat = renyiSpectrum(uniform4).map((s) => val(s.entropy));
    for (const h of flat) expect(h).toBeCloseTo(2, 10);

    const falling = renyiSpectrum(peaked).map((s) => val(s.entropy));
    expect(falling[0]!).toBeGreaterThan(falling[falling.length - 1]!);
  });

  it("separates a tail change from a mode change", () => {
    // The reason to have a spectrum rather than one number. Both variants below
    // differ from the base, but in different places, and Shannon alone would
    // fold the two together.
    const base = [0.5, 0.3, 0.15, 0.05];
    const tailChanged = [0.5, 0.3, 0.19, 0.01];
    const modeChanged = [0.62, 0.18, 0.15, 0.05];

    const spec = (p: number[]) => renyiSpectrum(p, [0.25, Infinity]).map((s) => val(s.entropy));
    const [baseTail, baseMode] = spec(base);
    const [tailTail, tailMode] = spec(tailChanged);
    const [modeTail, modeMode] = spec(modeChanged);

    // A tail change moves the low-alpha end far more than the min-entropy end.
    expect(Math.abs(tailTail! - baseTail!)).toBeGreaterThan(Math.abs(tailMode! - baseMode!));
    // A mode change moves the min-entropy end far more than the low-alpha end.
    expect(Math.abs(modeMode! - baseMode!)).toBeGreaterThan(Math.abs(modeTail! - baseTail!));
  });
});
