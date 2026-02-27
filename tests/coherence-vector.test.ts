import { describe, expect, it } from "vitest";
import {
  assertCoherenceVectorInvariants,
  coherenceDistance,
  computeCoherenceVectorHash,
  createCoherenceVector,
  isCoherenceVector,
  normalizeCoherenceScalars,
  serializeCoherenceScalarsCanonical,
} from "../src/coherence-vector";

describe("CoherenceVector canonical invariants", () => {
  it("normalizes all scalar metrics into [0,1]", () => {
    const normalized = normalizeCoherenceScalars({
      spectralNegentropy: 1.4,
      spectralEntropy: -0.25,
      geometricFitError: 0.3333333333,
      symmetry: 0.9,
      anisotropy: 2,
      roughness: -1,
    });

    expect(normalized.spectralNegentropy).toBe(1);
    expect(normalized.spectralEntropy).toBe(0);
    expect(normalized.geometricFitError).toBeGreaterThanOrEqual(0);
    expect(normalized.geometricFitError).toBeLessThanOrEqual(1);
    expect(normalized.anisotropy).toBe(1);
    expect(normalized.roughness).toBe(0);
  });

  it("serializes canonically independent of input object field order", () => {
    const a = {
      symmetry: 0.61,
      roughness: 0.00004,
      anisotropy: 0.39,
      geometricFitError: 0.000001,
      spectralEntropy: 0.2,
      spectralNegentropy: 0.8,
    };
    const b = {
      spectralNegentropy: 0.8,
      spectralEntropy: 0.2,
      geometricFitError: 0.000001,
      symmetry: 0.61,
      anisotropy: 0.39,
      roughness: 0.00004,
    };

    expect(serializeCoherenceScalarsCanonical(a)).toBe(
      serializeCoherenceScalarsCanonical(b),
    );
    expect(computeCoherenceVectorHash(a)).toBe(computeCoherenceVectorHash(b));
  });

  it("produces stable hash under tiny floating point noise (within rounding precision)", () => {
    const base = {
      spectralNegentropy: 0.812345678,
      spectralEntropy: 0.123456789,
      geometricFitError: 0.0456789123,
      symmetry: 0.654321098,
      anisotropy: 0.345678901,
      roughness: 0.111111111,
    };
    const noisy = {
      spectralNegentropy: base.spectralNegentropy + 1e-9,
      spectralEntropy: base.spectralEntropy - 1e-9,
      geometricFitError: base.geometricFitError + 2e-9,
      symmetry: base.symmetry - 2e-9,
      anisotropy: base.anisotropy + 1e-9,
      roughness: base.roughness - 1e-9,
    };

    expect(computeCoherenceVectorHash(base)).toBe(computeCoherenceVectorHash(noisy));
  });

  it("creates a valid canonical vector with deterministic hash", () => {
    const vector = createCoherenceVector({
      spectralNegentropy: 0.8,
      spectralEntropy: 0.2,
      geometricFitError: 0.04,
      symmetry: 0.61,
      anisotropy: 0.39,
      roughness: 0.00004,
    });

    expect(isCoherenceVector(vector)).toBe(true);
    expect(vector.attractorSignatureHash.startsWith("cv1_")).toBe(true);
    expect(() => assertCoherenceVectorInvariants(vector)).not.toThrow();
  });

  it("rejects invalid hashes", () => {
    const vector = createCoherenceVector({
      spectralNegentropy: 0.5,
      spectralEntropy: 0.5,
      geometricFitError: 0.3,
      symmetry: 0.4,
      anisotropy: 0.6,
      roughness: 0.2,
    });
    vector.attractorSignatureHash = "cv1_deadbeef";
    expect(() => assertCoherenceVectorInvariants(vector)).toThrow(/hash/i);
  });

  it("coherenceDistance is small for same-system perturbations and larger across separated vectors", () => {
    const a = createCoherenceVector({
      spectralNegentropy: 0.8,
      spectralEntropy: 0.2,
      geometricFitError: 0.05,
      symmetry: 0.7,
      anisotropy: 0.3,
      roughness: 0.1,
    });
    const b = createCoherenceVector({
      spectralNegentropy: 0.79,
      spectralEntropy: 0.21,
      geometricFitError: 0.055,
      symmetry: 0.69,
      anisotropy: 0.31,
      roughness: 0.11,
    });
    const c = createCoherenceVector({
      spectralNegentropy: 0.1,
      spectralEntropy: 0.9,
      geometricFitError: 0.8,
      symmetry: 0.2,
      anisotropy: 0.8,
      roughness: 0.7,
    });

    expect(coherenceDistance(a, b)).toBeLessThan(coherenceDistance(a, c));
  });
});
