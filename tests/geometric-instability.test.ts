import { describe, expect, it } from "vitest";
import { resolveGeometricInstability } from "../src/geometric-instability.js";

describe("geometric instability", () => {
  it("detects low instability in a held basin with good Lyapunov behavior", () => {
    const state = resolveGeometricInstability({
      geometry: {
        health: 0.82,
        validityTrusted: true,
        curvature: {
          lambdaMin: 0.14,
          conditionNumber: 4.2,
        },
        stability: {
          violationRate: 0.02,
          p95DeltaJ: -0.01,
          stable: true,
        },
      },
      jResolution: {
        resolved: true,
        basinHoldMet: true,
        lambdaMin: 0.12,
        deltaJViolationRate: 0.01,
      },
      regime: {
        regime: "stable-gradient",
        confidence: 0.84,
      },
      morphology: {
        symmetry: 0.81,
        roughness: 0.18,
        anisotropy: 0.16,
        fitError: 0.12,
      },
      transition: {
        driftRate: 0.04,
        driftAccel: 0.03,
        gamma: 0.96,
        entropy: 0.18,
        attractorSimilarity: 0.22,
      },
    });

    expect(state.instability).toBeLessThan(0.3);
    expect(state.basinStrength).toBeGreaterThan(0.6);
    expect(state.unstableModes).toBe(0);
    expect(state.confidence).toBeGreaterThan(0.7);
  });

  it("detects instability in saddle-like expanding geometry", () => {
    const state = resolveGeometricInstability({
      geometry: {
        health: 0.28,
        validityTrusted: false,
        curvature: {
          lambdaMin: -0.07,
          conditionNumber: 28,
        },
        stability: {
          violationRate: 0.31,
          p95DeltaJ: 0.18,
          stable: false,
        },
      },
      jResolution: {
        resolved: false,
        basinHoldMet: false,
        lambdaMin: -0.05,
        deltaJViolationRate: 0.26,
      },
      regime: {
        regime: "unstable",
        confidence: 0.72,
      },
      morphology: {
        symmetry: 0.33,
        roughness: 0.74,
        anisotropy: 0.69,
        fitError: 0.66,
      },
      transition: {
        driftRate: 0.61,
        driftAccel: 0.54,
        gamma: 1.9,
        entropy: 0.72,
        attractorSimilarity: 0.58,
      },
    });

    expect(state.instability).toBeGreaterThan(0.7);
    expect(state.curvatureRisk).toBeGreaterThan(0.72);
    expect(state.dominantExpansion).toBeGreaterThan(0.7);
    expect(state.lyapunovSlack).toBeGreaterThan(0.7);
    expect(state.unstableModes).toBeGreaterThanOrEqual(2);
  });

  it("treats chaotic but partially held geometry as intermediate risk", () => {
    const state = resolveGeometricInstability({
      geometry: {
        health: 0.56,
        validityTrusted: true,
        curvature: {
          lambdaMin: 0.03,
          conditionNumber: 10,
        },
        stability: {
          violationRate: 0.11,
          p95DeltaJ: 0.05,
          stable: false,
        },
      },
      jResolution: {
        resolved: false,
        basinHoldMet: false,
        lambdaMin: 0.02,
        deltaJViolationRate: 0.12,
      },
      regime: {
        regime: "chaotic",
        confidence: 0.61,
      },
      morphology: {
        symmetry: 0.48,
        roughness: 0.51,
        anisotropy: 0.44,
        fitError: 0.38,
      },
      transition: {
        driftRate: 0.22,
        driftAccel: 0.19,
        gamma: 1.18,
        entropy: 0.44,
        attractorSimilarity: 0.79,
      },
    });

    expect(state.instability).toBeGreaterThan(0.4);
    expect(state.instability).toBeLessThan(0.8);
    expect(state.unstableModes).toBeGreaterThanOrEqual(1);
    expect(state.diagnostics).toContain("regime:chaotic");
  });
});
