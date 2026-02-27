import { describe, expect, it } from "vitest";
import { generateRandomPoints } from "../src/tools.js";
import {
  extractGeometricSignature,
  generateCircle,
} from "../src/superformula.js";

const FAST_TEST_FIT = {
  seeds: 4,
  iterations: 20,
  randomSeed: 42,
  lossMode: "huber" as const,
  huberDelta: 0.15,
};

function makeRng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('Geometric Regime Classification', () => {
  it('circle has stronger geometric coherence than random noise', () => {
    const circle = generateCircle(100, 36);
    const circleSig = extractGeometricSignature(circle, {
      includeSuperformulaFit: true,
      fit: FAST_TEST_FIT,
    });
    const noise = generateRandomPoints(100, makeRng(42));
    const noiseSig = extractGeometricSignature(noise, {
      includeSuperformulaFit: true,
      fit: FAST_TEST_FIT,
    });

    expect(circleSig.symmetry).toBeGreaterThan(noiseSig.symmetry);
    expect(circleSig.fitError).toBeLessThan(noiseSig.fitError);
    expect(circleSig.roughness).toBeLessThanOrEqual(noiseSig.roughness + 0.2);
  });

  it('random noise does not look like a clean circle', () => {
    const noise = generateRandomPoints(100, makeRng(4242));
    const sig = extractGeometricSignature(noise, {
      includeSuperformulaFit: true,
      fit: FAST_TEST_FIT,
    });
    expect(sig.symmetry).toBeLessThan(0.95);
  });
});
