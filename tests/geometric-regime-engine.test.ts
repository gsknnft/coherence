import { describe, expect, it } from "vitest";
import type { GeometricSignature } from "../src/superformula.js";
import type { JSpaceResolution } from "../src/types.js";
import {
  buildGeometricRegimeInputs,
  evaluateGeometricRegime,
  type AttractorComparisonResult,
} from "../src/geometric-regime.js";

function makeSignature(
  overrides: Partial<GeometricSignature> = {},
): GeometricSignature {
  return {
    symmetry: 0.9,
    roughness: 0.03,
    anisotropy: 0.1,
    fitError: 0.04,
    sampleSize: 512,
    ...overrides,
  };
}

function makeJResolution(
  overrides: Partial<JSpaceResolution> = {},
): JSpaceResolution {
  return {
    resolved: true,
    reasons: [],
    gradNorm: 1e-4,
    lambdaMin: 0.12,
    deltaJViolationRate: 0.01,
    basinHoldMet: true,
    ...overrides,
  };
}

function makeAttractorComparison(
  overrides: Partial<Omit<AttractorComparisonResult, "diagnostics" | "scores">> & {
    diagnostics?: Partial<AttractorComparisonResult["diagnostics"]>;
    scores?: Partial<AttractorComparisonResult["scores"]>;
  } = {},
): AttractorComparisonResult {
  const base: AttractorComparisonResult = {
    bestMatch: null,
    similarity: 0.3,
    regime: "coherent",
    scores: {
      aizawa: 0.1,
      lorenz: 0.1,
      rossler: 0.1,
      henon: 0.1,
      duffing: 0.1,
    },
    diagnostics: {
      projection: "xy",
      fitError: 0.04,
      symmetry: 0.9,
      roughness: 0.03,
      anisotropy: 0.1,
      coherentGate: true,
      matchScore: 0.3,
      flowAlignment: -0.98,
      flowAlignmentAbs: 0.98,
      flowAlignmentSamples: 256,
      flowAlignmentMode: "descent",
    },
  };

  return {
    ...base,
    ...overrides,
    diagnostics: {
      ...base.diagnostics,
      ...(overrides.diagnostics ?? {}),
    },
    scores: {
      ...base.scores,
      ...(overrides.scores ?? {}),
    },
  };
}

describe("Geometric Regime Engine", () => {
  it("buildGeometricRegimeInputs is a thin passthrough adapter", () => {
    const jResolution = makeJResolution();
    const attractorComparison = makeAttractorComparison();
    const morphology = makeSignature();

    const inputs = buildGeometricRegimeInputs({
      jResolution,
      attractorComparison,
      morphology,
    });

    expect(inputs).toEqual({ jResolution, attractorComparison, morphology });
    expect(inputs.jResolution).toBe(jResolution);
    expect(inputs.attractorComparison).toBe(attractorComparison);
    expect(inputs.morphology).toBe(morphology);
  });

  it("classifies stable-gradient when J-space and flow descent agree", () => {
    const result = evaluateGeometricRegime({
      jResolution: makeJResolution(),
      attractorComparison: makeAttractorComparison(),
      morphology: makeSignature(),
    });

    expect(result.regime).toBe("stable-gradient");
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.diagnostics).toContain("fusion:gradient_descent_alignment");
  });

  it("classifies chaotic for orthogonal flow plus strong chaotic similarity", () => {
    const result = evaluateGeometricRegime({
      jResolution: makeJResolution({ resolved: false, basinHoldMet: false }),
      attractorComparison: makeAttractorComparison({
        regime: "chaotic",
        bestMatch: "lorenz",
        similarity: 0.86,
        diagnostics: {
          flowAlignment: 0.01,
          flowAlignmentAbs: 0.08,
          flowAlignmentMode: "orthogonal",
          coherentGate: false,
          matchScore: 0.86,
        },
      }),
      morphology: makeSignature({ symmetry: 0.35, roughness: 0.4, fitError: 0.25 }),
    });

    expect(result.regime).toBe("chaotic");
    expect(result.diagnostics).toContain("fusion:non_gradient_chaotic_orbit");
  });

  it("classifies model-mismatch for uphill flow against resolved J-space", () => {
    const result = evaluateGeometricRegime({
      jResolution: makeJResolution({ resolved: true, lambdaMin: 0.08 }),
      attractorComparison: makeAttractorComparison({
        regime: "coherent",
        similarity: 0.42,
        diagnostics: {
          flowAlignment: 0.72,
          flowAlignmentAbs: 0.72,
          flowAlignmentMode: "uphill",
          coherentGate: true,
        },
      }),
      morphology: makeSignature(),
    });

    expect(result.regime).toBe("model-mismatch");
    expect(result.diagnostics).toContain("fusion:j_flow_contradiction");
  });

  it("classifies unstable for uphill flow with unresolved J-space", () => {
    const result = evaluateGeometricRegime({
      jResolution: makeJResolution({
        resolved: false,
        basinHoldMet: false,
        lambdaMin: -0.01,
        deltaJViolationRate: 0.24,
        reasons: ["lambda_min_low", "deltaJ_violations"],
      }),
      attractorComparison: makeAttractorComparison({
        regime: "turbulent",
        similarity: 0.33,
        diagnostics: {
          flowAlignment: 0.46,
          flowAlignmentAbs: 0.46,
          flowAlignmentMode: "uphill",
          coherentGate: false,
        },
      }),
      morphology: makeSignature({ symmetry: 0.45, roughness: 0.35, fitError: 0.3 }),
    });

    expect(result.regime).toBe("unstable");
    expect(result.diagnostics).toContain("fusion:instability_inferred");
  });

  it("flags ambiguous zero-mean/high-abs flow as potentially bimodal", () => {
    const result = evaluateGeometricRegime({
      jResolution: makeJResolution({ resolved: false }),
      attractorComparison: makeAttractorComparison({
        regime: "turbulent",
        similarity: 0.4,
        diagnostics: {
          flowAlignment: 0.02,
          flowAlignmentAbs: 0.82,
          flowAlignmentMode: "mixed",
          coherentGate: false,
        },
      }),
    });

    expect(result.diagnostics).toContain(
      "flow:zero_mean_high_abs_possible_bimodal",
    );
  });
});
