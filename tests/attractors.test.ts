// @gsknnft/coherence/tests/attractors.test.ts

// import { parseArgs } from "util";
import { describe, expect, it } from "vitest";
import {
  computeAizawa,
  computeLorenz,
  computeRossler,
  projectToPolar,
} from "../src/attractors";
import {
  compareToAttractors,
  REFERENCE_SIGNATURES,
} from "../src/attractors/comparison";
import { extractGeometricSignature } from "../src/superformula";
import type { Vector3 } from "../src/types";

// const args = ["-debug"];
// const options = {
//   DEBUG: {
//     type: "boolean" as const,
//     short: "debug",
//   },
//   bar: {
//     type: "string" as const,
//   },
// };
// const { values, positionals } = parseArgs({ args, options });
// console.log(values, positionals);

const DEBUG = process.env.DEBUG === "true" ? true : false; // Set to true to enable debug logging in tests

function downsamplePolar<T>(points: T[], maxPoints = 1500): T[] {
  if (points.length <= maxPoints) return points;
  const stride = Math.max(1, Math.floor(points.length / maxPoints));
  const sampled: T[] = [];
  for (let i = 0; i < points.length; i += stride) sampled.push(points[i]);
  return sampled;
}

const FAST_TEST_FIT = {
  seeds: 4,
  iterations: 20,
  randomSeed: 42,
  lossMode: "huber" as const,
  huberDelta: 0.15,
};

function circleSignature() {
  const circlePoints = Array.from({ length: 1000 }, (_, i) => ({
    angle: (i / 1000) * 2 * Math.PI,
    radius: 1.0,
  }));
  return extractGeometricSignature(circlePoints, {
    includeSuperformulaFit: true,
    histogramBins: 48,
    harmonics: 16,
    fit: FAST_TEST_FIT,
  });
}

describe("Strange Attractors", () => {
  describe("Lorenz Attractor", () => {
    it("generates butterfly-shaped trajectory", () => {
      const positions = computeLorenz({ steps: 5000 });
      expect(positions.length).toBe(5000 * 3);
      for (let i = 0; i < positions.length; i++) {
        expect(Number.isFinite(positions[i])).toBe(true);
      }
    });

    it("exhibits a less-coherent signature than a circle", () => {
      const positions = computeLorenz({ steps: 5000 });
      const polar = downsamplePolar(projectToPolar(positions, "xz"));
      const sig = extractGeometricSignature(polar, {
        includeSuperformulaFit: true,
        histogramBins: 48,
        harmonics: 16,
        fit: FAST_TEST_FIT,
      });
      const circle = circleSignature();

      expect(sig.fitError).toBeGreaterThan(circle.fitError);
      expect(sig.symmetry).toBeLessThan(circle.symmetry);
      expect(sig.anisotropy).toBeGreaterThan(circle.anisotropy);
    });
  });

  describe("Rossler Attractor", () => {
    it("generates spiral trajectory", () => {
      const positions = computeRossler({ steps: 5000 });
      expect(positions.length).toBe(5000 * 3);
      for (let i = 0; i < positions.length; i++) {
        expect(Number.isFinite(positions[i])).toBe(true);
      }
    });

    it("exhibits a less-coherent signature than a circle", () => {
      const positions = computeRossler({ steps: 5000 });
      const polar = downsamplePolar(projectToPolar(positions, "xy"));
      const sig = extractGeometricSignature(polar, {
        includeSuperformulaFit: true,
        histogramBins: 48,
        harmonics: 16,
        fit: FAST_TEST_FIT,
      });
      const circle = circleSignature();

      expect(sig.fitError).toBeGreaterThan(circle.fitError);
      expect(sig.symmetry).toBeLessThanOrEqual(circle.symmetry + 0.15);
    });
  });

  describe("Attractor Comparison", () => {
    it("scores Lorenz as chaotic", { timeout: 15000 }, () => {
      const lorenz = computeLorenz({ steps: 5000 });
      const result = compareToAttractors(lorenz, "xz");

      expect(result.scores.lorenz).toBeGreaterThan(0.35);
      expect(result.regime).toBe("chaotic");
    });

    it("scores Rossler as chaotic", { timeout: 15000 }, () => {
      const rossler = computeRossler({ steps: 5000 });
      const result = compareToAttractors(rossler, "xy");

      expect(result.scores.rossler).toBeGreaterThan(0.35);
      expect(result.regime).toBe("chaotic");
    });

    it("scores Aizawa as chaotic", () => {
      const aizawa = computeAizawa({ steps: 5000 });
      const result = compareToAttractors(aizawa, "xy");

      expect(result.scores.aizawa).toBeGreaterThan(0.35);
      expect(result.regime).toBe("chaotic");
    });

    it("keeps coherent circles out of chaotic regime", () => {
      const circle = new Float64Array(3000);
      for (let i = 0; i < 1000; i++) {
        const angle = (i / 1000) * 2 * Math.PI;
        circle[i * 3] = Math.cos(angle);
        circle[i * 3 + 1] = Math.sin(angle);
        circle[i * 3 + 2] = 0;
      }

      const result = compareToAttractors(circle, "xy");
      if (DEBUG) {
        console.log(
          "[attractor-test circle]",
          JSON.stringify(
            {
              regime: result.regime,
              similarity: result.similarity,
              bestMatch: result.bestMatch,
              diagnostics: result.diagnostics,
              scores: result.scores,
            },
            null,
            2,
          ),
        );
      }
      expect(result.similarity).toBeLessThan(0.9);
      expect(result.regime).toBe("coherent");
    });

    it("reports flow alignment against an optional J-gradient", () => {
      const circle = new Float64Array(3000);
      for (let i = 0; i < 1000; i++) {
        const angle = (i / 1000) * 2 * Math.PI;
        circle[i * 3] = Math.cos(angle);
        circle[i * 3 + 1] = Math.sin(angle);
        circle[i * 3 + 2] = 0;
      }

      const radialGradient = ([x, y, z]: Vector3): Vector3 => [x, y, z];
      const tangentialGradient = ([x, y, z]: Vector3): Vector3 => [y, -x, z];

      const orthogonal = compareToAttractors(circle, "xy", {
        gradient: radialGradient,
      });
      const descent = compareToAttractors(circle, "xy", {
        gradient: tangentialGradient,
      });

      expect(orthogonal.diagnostics.flowAlignment).not.toBeNull();
      expect(Math.abs(orthogonal.diagnostics.flowAlignment ?? 1)).toBeLessThan(
        0.05,
      );
      expect(orthogonal.diagnostics.flowAlignmentMode).toBe("orthogonal");

      expect(descent.diagnostics.flowAlignment).not.toBeNull();
      expect(descent.diagnostics.flowAlignment ?? 0).toBeLessThan(-0.95);
      expect(descent.diagnostics.flowAlignmentMode).toBe("descent");
    });
  });

  describe("Reference Signatures", () => {
    it("caches reference signatures", { timeout: 15000 }, () => {
      const sig1 = REFERENCE_SIGNATURES.lorenz;
      const sig2 = REFERENCE_SIGNATURES.lorenz;
      expect(sig1).toBe(sig2);
    });

    it("exposes distinct reference signatures", { timeout: 15000 }, () => {
      const aizawa = REFERENCE_SIGNATURES.aizawa;
      const lorenz = REFERENCE_SIGNATURES.lorenz;
      const rossler = REFERENCE_SIGNATURES.rossler;

      expect(aizawa.fitError).toBeGreaterThanOrEqual(0);
      expect(lorenz.fitError).toBeGreaterThanOrEqual(0);
      expect(rossler.fitError).toBeGreaterThanOrEqual(0);

      const aizawaLorenzDiff = Math.abs(aizawa.fitError - lorenz.fitError);
      const lorenzRosslerDiff = Math.abs(lorenz.fitError - rossler.fitError);
      const symDiff = Math.abs(aizawa.symmetry - lorenz.symmetry);

      expect(
        aizawaLorenzDiff > 0.01 || lorenzRosslerDiff > 0.01 || symDiff > 0.01,
      ).toBe(true);
    });
  });
});
