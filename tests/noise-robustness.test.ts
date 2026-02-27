import { describe, expect, it } from "vitest";
import { classifyGeometricRegime } from "../src/geometric-regime.js";
import {
  calibrateGeometricSignal,
  extractGeometricSignature,
  generateCircle,
} from "../src/superformula.js";
import {
  addPolarNoise,
  expectMonotonicNonDecreasing,
} from "./_helpers/coherenceStress.js";

const FAST_TEST_FIT = {
  seeds: 4,
  iterations: 20,
  randomSeed: 42,
  lossMode: "huber" as const,
  huberDelta: 0.15,
};

describe("Noise Robustness", () => {
  it("degrades geometric coherence gradually under increasing noise", () => {
    const base = generateCircle(100, 72);
    const noiseLevels = [0, 0.01, 0.05, 0.1, 0.2];

    const signatures = noiseLevels.map((level, idx) =>
      extractGeometricSignature(addPolarNoise(base, level, 1000 + idx), {
        includeSuperformulaFit: true,
        fit: FAST_TEST_FIT,
      }),
    );
    const calibrated = signatures.map((s) => calibrateGeometricSignal(s));
    const regimes = signatures.map((s) => classifyGeometricRegime(s));

    for (const sig of signatures) {
      expect(Number.isFinite(sig.fitError)).toBe(true);
      expect(Number.isFinite(sig.symmetry)).toBe(true);
      expect(Number.isFinite(sig.roughness)).toBe(true);
      expect(Number.isFinite(sig.anisotropy)).toBe(true);
    }

    expectMonotonicNonDecreasing(
      signatures.map((s) => s.fitError),
      0.03,
    );

    // Raw symmetry can rebound under radial noise because the score blends mirror
    // symmetry with low-even harmonic energy. Use calibrated score for degradation.
    expect(calibrated[0].score).toBeGreaterThan(calibrated.at(-1)!.score);
    expect(calibrated[0].entropyProxy).toBeLessThanOrEqual(
      calibrated.at(-1)!.entropyProxy + 0.05,
    );
    expect(signatures[0].roughness).toBeLessThanOrEqual(
      signatures.at(-1)!.roughness + 0.05,
    );

    // Low noise should not immediately collapse into the worst regime.
    expect(regimes[1].regime).not.toBe("predatory");
    expect(regimes[2].regime).not.toBe("predatory");
  });
});
