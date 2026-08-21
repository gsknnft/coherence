import {
  COHERENCE_VECTOR_DECIMALS,
  type CoherenceVector,
  type CoherenceVectorScalars,
} from "./types.js";
import {
  assertCoherenceVectorInvariants,
  coherenceDistance,
  computeCoherenceVectorHash,
  isCoherenceVector,
  normalizeCoherenceScalar,
  normalizeCoherenceScalars,
  serializeCoherenceScalarsCanonical,
} from "./coherence-vector.js";

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
    return normalizeCoherenceScalar(value, decimals);
  }

  static normalizeScalars(
    input: CoherenceVectorScalars,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): CoherenceVectorScalars {
    return normalizeCoherenceScalars(input, decimals);
  }

  static serializeCanonical(
    input: CoherenceVectorScalars,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): string {
    return serializeCoherenceScalarsCanonical(input, decimals);
  }

  static computeHash(
    input: CoherenceVectorScalars,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): string {
    return computeCoherenceVectorHash(input, decimals);
  }

  static fromScalars(
    input: CoherenceVectorScalars,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): CoherenceVector {
    return new CoherenceVectorClass(input, decimals);
  }

  static isCoherenceVector(value: unknown): value is CoherenceVector {
    return isCoherenceVector(value);
  }

  static assertInvariants(
    value: CoherenceVector,
    decimals = COHERENCE_VECTOR_DECIMALS,
  ): void {
    try {
      assertCoherenceVectorInvariants(value, decimals);
    } catch (error) {
      throw new CoherenceVectorError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  static coherenceDistance(a: CoherenceVector, b: CoherenceVector): number {
    return coherenceDistance(a, b);
  }

  static create(_points: number[][]): never {
    throw new CoherenceVectorError(
      "Direct creation from raw points is not implemented. Provide scalar values via CoherenceVectorClass.fromScalars().",
    );
  }
}
