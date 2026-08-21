import { describe, expect, it } from "vitest";
import {
  assertCoherenceVectorInvariants,
  coherenceDistance,
  computeCoherenceVectorDigest,
  computeCoherenceVectorHash,
  computeLegacyClassFnv1a64Hash,
  computeLegacyClassSha256Hash,
  createCoherenceVector,
  isCoherenceVector,
  migrateCoherenceVectorHash,
  normalizeCoherenceScalars,
  recognizeCoherenceVectorHash,
  serializeCoherenceScalarsCanonical,
} from "../src/coherence-vector";
import { CoherenceVectorClass } from "../src/CoherenceVector";

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
    expect(vector.attractorSignatureHash).toBe("cv1_0b318b00");
    expect(() => assertCoherenceVectorInvariants(vector)).not.toThrow();
  });

  it("keeps the class and functional APIs on the same frozen cv1 contract", () => {
    const input = {
      spectralNegentropy: 0.8,
      spectralEntropy: 0.2,
      geometricFitError: 0.04,
      symmetry: 0.61,
      anisotropy: 0.39,
      roughness: 0.00004,
    };
    expect(CoherenceVectorClass.fromScalars(input).attractorSignatureHash).toBe(
      createCoherenceVector(input).attractorSignatureHash,
    );
  });

  it("recognizes and migrates both legacy class hashes", () => {
    const input = {
      spectralNegentropy: 0.8,
      spectralEntropy: 0.2,
      geometricFitError: 0.04,
      symmetry: 0.61,
      anisotropy: 0.39,
      roughness: 0.00004,
    };
    const canonical = computeCoherenceVectorHash(input);
    const legacyHashes = [
      computeLegacyClassSha256Hash(input),
      computeLegacyClassFnv1a64Hash(input),
    ];

    for (const legacyHash of legacyHashes) {
      const recognition = recognizeCoherenceVectorHash(input, legacyHash);
      expect(recognition.valid).toBe(true);
      expect(recognition.migrationRequired).toBe(true);
      expect(migrateCoherenceVectorHash(input, legacyHash)).toBe(canonical);
      expect(() =>
        assertCoherenceVectorInvariants({
          ...input,
          attractorSignatureHash: legacyHash,
        }),
      ).not.toThrow();
    }
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

describe("CoherenceVector identity digest", () => {
  const scalars = {
    spectralNegentropy: 0.71,
    spectralEntropy: 0.42,
    geometricFitError: 0.13,
    symmetry: 0.88,
    anisotropy: 0.29,
    roughness: 0.34,
  };

  it("is deterministic for the same scalars", () => {
    expect(computeCoherenceVectorDigest(scalars)).toBe(
      computeCoherenceVectorDigest(scalars),
    );
  });

  it("is independent of input object field order", () => {
    // The digest must describe the vector, not one serialization of it — the
    // same property the canonical event signer guarantees.
    const reordered = {
      roughness: 0.34,
      anisotropy: 0.29,
      symmetry: 0.88,
      geometricFitError: 0.13,
      spectralEntropy: 0.42,
      spectralNegentropy: 0.71,
    };

    expect(computeCoherenceVectorDigest(reordered)).toBe(
      computeCoherenceVectorDigest(scalars),
    );
  });

  it("carries the cvd1 prefix and a full 256-bit hex body", () => {
    // Full width is the point: a truncated digest would reintroduce the
    // collision exposure the fingerprint already has.
    const digest = computeCoherenceVectorDigest(scalars);

    expect(digest.startsWith("cvd1_")).toBe(true);
    expect(digest.slice("cvd1_".length)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is distinguishable from the short fingerprint at a glance", () => {
    // Distinct prefixes so neither value can be silently accepted where the
    // other was meant.
    const digest = computeCoherenceVectorDigest(scalars);
    const fingerprint = computeCoherenceVectorHash(scalars);

    expect(digest).not.toBe(fingerprint);
    expect(digest.startsWith("cv1_")).toBe(false);
    expect(fingerprint.startsWith("cvd1_")).toBe(false);
  });

  it("agrees with the fingerprint about which vectors are the same", () => {
    // The two layers share one canonical serialization, so they must never
    // disagree about equality — only about collision resistance.
    const same = { ...scalars };
    const different = { ...scalars, symmetry: 0.87 };

    expect(computeCoherenceVectorDigest(same)).toBe(computeCoherenceVectorDigest(scalars));
    expect(computeCoherenceVectorHash(same)).toBe(computeCoherenceVectorHash(scalars));
    expect(computeCoherenceVectorDigest(different)).not.toBe(
      computeCoherenceVectorDigest(scalars),
    );
  });

  it("tracks the same rounding precision as the fingerprint", () => {
    // Noise below the 1e-8 quantum must not change identity, or the digest
    // would be unusable as a store key for recomputed vectors.
    const noisy = { ...scalars, symmetry: 0.88 + 1e-12 };

    expect(computeCoherenceVectorDigest(noisy)).toBe(computeCoherenceVectorDigest(scalars));
  });
});
