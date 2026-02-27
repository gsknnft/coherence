import { describe, expect, it } from "vitest";
import {
  driftRate,
  featuresFromFrame,
} from "../src/governance/drift.js";
import {
  DEFAULT_MAX_GAMMA,
  DEFAULT_POINT_OF_NO_RETURN_RATIO,
  evaluateLorentzBarrier,
  lorentzGamma,
} from "../src/governance/lorentz.js";
import {
  posteriorArgmax,
  posteriorConfidence,
  posteriorEntropy,
  uniformPosterior,
  updateRegimePosterior,
} from "../src/regime/bayes-filter.js";

describe("governance observability", () => {
  it("builds drift features from frame-like input", () => {
    const features = featuresFromFrame({
      geometryState: {
        health: 0.42,
        curvature: { lambdaMin: 0.08 },
        stability: { violationRate: 0.11 },
      },
      attractorComparison: {
        similarity: 0.73,
        diagnostics: {
          flowAlignment: -0.2,
          flowAlignmentAbs: 0.4,
        },
      },
    });

    expect(features.health).toBeCloseTo(0.42, 6);
    expect(features.lambdaMin).toBeCloseTo(0.08, 6);
    expect(features.violationRate).toBeCloseTo(0.11, 6);
    expect(features.attractorSim).toBeCloseTo(0.73, 6);
    expect(features.flowMeanCos).toBeCloseTo(-0.2, 6);
    expect(features.flowAbsCos).toBeCloseTo(0.4, 6);
  });

  it("computes drift rate and Lorentz barrier with bound checks", () => {
    const a = {
      health: 0.5,
      lambdaMin: 0.08,
      violationRate: 0.07,
      flowMeanCos: -0.1,
      flowAbsCos: 0.3,
      attractorSim: 0.4,
    };
    const b = {
      health: 0.4,
      lambdaMin: 0.1,
      violationRate: 0.03,
      flowMeanCos: -0.2,
      flowAbsCos: 0.2,
      attractorSim: 0.2,
    };

    const rate = driftRate(a, b, 0.5);
    expect(rate).toBeGreaterThan(0);

    const barrier = evaluateLorentzBarrier(rate, 0.2);
    expect(barrier.gamma).toBeGreaterThanOrEqual(1);
    expect(barrier.boundExceeded).toBe(rate >= 0.2);
    expect(lorentzGamma(0.1, 0.2)).toBeGreaterThanOrEqual(1);
  });

  it("hard-caps gamma when ratio exceeds bound", () => {
    const barrier = evaluateLorentzBarrier(1.2, 0.2);
    expect(barrier.boundExceeded).toBe(true);
    expect(barrier.pointOfNoReturn).toBe(true);
    expect(Number.isFinite(barrier.gamma)).toBe(true);
    expect(barrier.gamma).toBe(DEFAULT_MAX_GAMMA);
    expect(barrier.clipped).toBe(true);
    expect(barrier.returnVelocity).toBeCloseTo(
      0.2 * DEFAULT_POINT_OF_NO_RETURN_RATIO,
      9,
    );
  });

  it("distinguishes recoverable bound exceed from point-of-no-return", () => {
    const bound = 0.2;
    const recoverable = evaluateLorentzBarrier(bound * 1.02, bound);
    const unrecoverable = evaluateLorentzBarrier(bound * 1.25, bound);

    expect(recoverable.boundExceeded).toBe(true);
    expect(recoverable.pointOfNoReturn).toBe(false);
    expect(unrecoverable.boundExceeded).toBe(true);
    expect(unrecoverable.pointOfNoReturn).toBe(true);
  });

  it("updates posterior and yields confidence/argmax", () => {
    const prior = uniformPosterior();
    const posterior = updateRegimePosterior(prior, {
      health: 0.75,
      lambdaMin: 0.14,
      violationRate: 0.02,
      flowMeanCos: -0.92,
      flowAbsCos: 0.95,
      attractorSimilarity: 0.2,
      jspaceResolved: true,
      deterministicRegime: "stable-gradient",
    });

    const label = posteriorArgmax(posterior);
    expect(label).toBe("stable-gradient");

    const conf = posteriorConfidence(posterior);
    const entropy = posteriorEntropy(posterior);
    expect(conf).toBeGreaterThan(0);
    expect(conf).toBeLessThanOrEqual(1);
    expect(entropy).toBeGreaterThanOrEqual(0);
  });
});
