// @gsknnft/coherence/tests/strange-attractors.test.ts
import { describe, expect, it } from "vitest";
import { computeAizawa } from "../src/attractors/aizawa";
import { projectToPolar } from "../src/attractors/projection";
import { extractGeometricSignature } from "../src/superformula.js";

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
    fit: FAST_TEST_FIT,
  });
}

describe("Strange Attractor Detection", () => {
  it("identifies Aizawa attractor as chaotic", () => {
    // Generate Aizawa attractor
    const positions = computeAizawa({
      steps: 10000,
      dt: 0.01,
    });

    // Project to 2D and convert to polar
    const polarPoints = downsamplePolar(projectToPolar(positions, "xy"));

    // Extract geometric signature
    const signature = extractGeometricSignature(polarPoints, {
      includeSuperformulaFit: true,
      histogramBins: 48,
      harmonics: 16,
      fit: FAST_TEST_FIT,
    });
    const baselineCircle = circleSignature();

    expect(signature.fitError).toBeGreaterThan(baselineCircle.fitError);
    expect(signature.symmetry).toBeLessThan(baselineCircle.symmetry);
    expect(signature.anisotropy).toBeGreaterThan(baselineCircle.anisotropy);
  });

  it("distinguishes Aizawa from circle", () => {
    const circleSig = circleSignature();

    // Generate Aizawa
    const aizawa = computeAizawa({ steps: 10000 });
    const aizawaPolar = downsamplePolar(projectToPolar(aizawa, "xy"));
    const aizawaSig = extractGeometricSignature(aizawaPolar, {
      includeSuperformulaFit: true,
      fit: FAST_TEST_FIT,
    });

    // Circle should have much lower fit error
    expect(aizawaSig.fitError).toBeGreaterThan(circleSig.fitError);

    expect(aizawaSig.symmetry).toBeLessThan(circleSig.symmetry);
    expect(aizawaSig.anisotropy).toBeGreaterThan(circleSig.anisotropy);
  });

  // it("identifies Aizawa attractor as chaotic/predatory", () => {
  //   const points = generateAizawaAttractor(1, 0, 0);
  //   const signature = extractGeometricSignature(points, {
  //     includeSuperformulaFit: true,
  //   });

  //   // Strange attractors should have high fit error
  //   expect(signature.fitError).toBeGreaterThan(0.5);

  //   // And low symmetry
  //   expect(signature.symmetry).toBeLessThan(0.3);

  //   // Classification should be chaotic or predatory
  //   const regime = classifyGeometricRegime(signature);
  //   expect(["chaotic", "predatory"]).toContain(regime.regime);
  // });
});
