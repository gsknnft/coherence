import { createHash } from "crypto";
import {
  COHERENCE_VECTOR_DECIMALS,
  COHERENCE_VECTOR_HASH_PREFIX,
  COHERENCE_VECTOR_SCALAR_KEYS,
  type CoherenceVector,
  type CoherenceVectorScalars,
} from "./types.js";

export class CoherenceVectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoherenceVectorError";
  }
}

export class CoherenceVectorClass implements CoherenceVector {
  readonly spectralNegentropy: number;
  readonly spectralEntropy: number;
  readonly geometricFitError: number;
  readonly symmetry: number;
  readonly anisotropy: number;
  readonly roughness: number;
  readonly attractorSignatureHash: string;

  constructor(
    input: CoherenceVectorScalars,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ) {
    const v = CoherenceVectorClass.normalizeScalars(input, decimals);

    this.spectralNegentropy = v.spectralNegentropy;
    this.spectralEntropy = v.spectralEntropy;
    this.geometricFitError = v.geometricFitError;
    this.symmetry = v.symmetry;
    this.anisotropy = v.anisotropy;
    this.roughness = v.roughness;

    // ✅ hash from scalars only (not `this`)
    this.attractorSignatureHash = CoherenceVectorClass.computeHash(v, decimals);

    Object.freeze(this);
  }

  static normalizeScalar(
    value: number,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): number {
    if (!Number.isFinite(value)) {
      throw new CoherenceVectorError(
        `CoherenceVector metric must be finite. Received: ${value}`,
      );
    }
    const clamped = Math.min(1, Math.max(0, value));
    const factor = 10 ** Math.max(0, decimals);
    return Math.round(clamped * factor) / factor;
  }

  static normalizeScalars(
    input: CoherenceVectorScalars,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): CoherenceVectorScalars {
    return {
      spectralNegentropy: this.normalizeScalar(
        input.spectralNegentropy,
        decimals,
      ),
      spectralEntropy: this.normalizeScalar(input.spectralEntropy, decimals),
      geometricFitError: this.normalizeScalar(
        input.geometricFitError,
        decimals,
      ),
      symmetry: this.normalizeScalar(input.symmetry, decimals),
      anisotropy: this.normalizeScalar(input.anisotropy, decimals),
      roughness: this.normalizeScalar(input.roughness, decimals),
    };
  }

  static serializeCanonical(
    input: CoherenceVectorScalars,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): string {
    const v = this.normalizeScalars(input, decimals);
    // ✅ keys in canonical order; delimiter-based (no JSON ambiguity)
    return COHERENCE_VECTOR_SCALAR_KEYS.map(
      (k) => `${k}=${(v[k] as number).toFixed(decimals)}`,
    ).join("|");
  }

  static computeHash(
    input: CoherenceVectorScalars,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): string {
    const canonical = this.serializeCanonical(input, decimals);
    const hex = createHash("sha256").update(canonical, "utf8").digest("hex");
    // short but strong enough; adjust length as desired
    return `${COHERENCE_VECTOR_HASH_PREFIX}${hex.slice(0, 16)}`;
  }

  static fromScalars(
    input: CoherenceVectorScalars,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): CoherenceVector {
    return new CoherenceVectorClass(input, decimals);
  }

  static isCoherenceVector(value: unknown): value is CoherenceVector {
    if (!value || typeof value !== "object") return false;
    const v = value as Record<string, unknown>;
    if (typeof v.attractorSignatureHash !== "string") return false;

    for (const k of COHERENCE_VECTOR_SCALAR_KEYS) {
      const n = v[k];
      if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1)
        return false;
    }
    return true;
  }

  static assertInvariants(
    value: CoherenceVector,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): void {
    if (!this.isCoherenceVector(value)) {
      throw new CoherenceVectorError(
        "Invalid CoherenceVector: expected finite normalized scalars in [0,1] and hash string.",
      );
    }

    const scalars: CoherenceVectorScalars = {
      spectralNegentropy: value.spectralNegentropy,
      spectralEntropy: value.spectralEntropy,
      geometricFitError: value.geometricFitError,
      symmetry: value.symmetry,
      anisotropy: value.anisotropy,
      roughness: value.roughness,
    };

    const expectedHash = this.computeHash(scalars, decimals);
    if (value.attractorSignatureHash !== expectedHash) {
      throw new CoherenceVectorError(
        `Invalid CoherenceVector hash: expected ${expectedHash}, received ${value.attractorSignatureHash}`,
      );
    }
  }

  static coherenceDistance(a: CoherenceVector, b: CoherenceVector): number {
    this.assertInvariants(a);
    this.assertInvariants(b);

    let sumSq = 0;
    for (const key of COHERENCE_VECTOR_SCALAR_KEYS) {
      const d = (a[key] as number) - (b[key] as number);
      sumSq += d * d;
    }
    return Math.sqrt(sumSq / COHERENCE_VECTOR_SCALAR_KEYS.length);
  }

  static create(_points: number[][]): never {
    throw new CoherenceVectorError(
      "Direct creation from raw points is not implemented. Provide scalar values via CoherenceVectorClass.fromScalars().",
    );
  }
}
