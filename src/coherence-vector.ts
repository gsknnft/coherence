import { COHERENCE_VECTOR_DECIMALS, CoherenceVectorScalars, COHERENCE_VECTOR_HASH_PREFIX, CoherenceVector, COHERENCE_VECTOR_SCALAR_KEYS } from "./types.js";


export function serializeCoherenceVector(
  scalars: Record<string, number>,
): string {
  return COHERENCE_VECTOR_SCALAR_KEYS.map(
    (k) => `${k}=${scalars[k].toFixed(8)}`,
  ).join("|");
}

export function coherenceDistance(
  a: CoherenceVector,
  b: CoherenceVector,
): number {
  assertCoherenceVectorInvariants(a);
  assertCoherenceVectorInvariants(b);
  let sumSq = 0;
  for (const key of COHERENCE_VECTOR_SCALAR_KEYS) {
    const d = a[key] - b[key];
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / COHERENCE_VECTOR_SCALAR_KEYS.length);
}

export function normalizeCoherenceScalar(
  value: number,
  decimals = COHERENCE_VECTOR_DECIMALS,
): number {
  if (!Number.isFinite(value)) {
    throw new Error(`CoherenceVector metric must be finite. Received: ${value}`);
  }
  const clamped = Math.min(1, Math.max(0, value));
  const factor = 10 ** Math.max(0, decimals);
  return Math.round(clamped * factor) / factor;
}

export function normalizeCoherenceScalars(
  input: CoherenceVectorScalars,
  decimals = COHERENCE_VECTOR_DECIMALS,
): CoherenceVectorScalars {
  return {
    spectralNegentropy: normalizeCoherenceScalar(input.spectralNegentropy, decimals),
    spectralEntropy: normalizeCoherenceScalar(input.spectralEntropy, decimals),
    geometricFitError: normalizeCoherenceScalar(input.geometricFitError, decimals),
    symmetry: normalizeCoherenceScalar(input.symmetry, decimals),
    anisotropy: normalizeCoherenceScalar(input.anisotropy, decimals),
    roughness: normalizeCoherenceScalar(input.roughness, decimals),
  };
}

export function serializeCoherenceScalarsCanonical(
  input: CoherenceVectorScalars,
  decimals = COHERENCE_VECTOR_DECIMALS,
): string {
  const v = normalizeCoherenceScalars(input, decimals);
  return `{"spectralNegentropy":${v.spectralNegentropy.toFixed(decimals)},"spectralEntropy":${v.spectralEntropy.toFixed(decimals)},"geometricFitError":${v.geometricFitError.toFixed(decimals)},"symmetry":${v.symmetry.toFixed(decimals)},"anisotropy":${v.anisotropy.toFixed(decimals)},"roughness":${v.roughness.toFixed(decimals)}}`;
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function computeCoherenceVectorHash(
  input: CoherenceVectorScalars,
  decimals = COHERENCE_VECTOR_DECIMALS,
): string {
  const canonical = serializeCoherenceScalarsCanonical(input, decimals);
  return `${COHERENCE_VECTOR_HASH_PREFIX}${fnv1a32(canonical)}`;
}

export function createCoherenceVector(
  input: CoherenceVectorScalars,
  decimals = COHERENCE_VECTOR_DECIMALS,
): CoherenceVector {
  const normalized = normalizeCoherenceScalars(input, decimals);
  return {
    ...normalized,
    attractorSignatureHash: computeCoherenceVectorHash(normalized, decimals),
  };
}

export function isCoherenceVector(value: unknown): value is CoherenceVector {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.attractorSignatureHash !== "string") return false;
  return COHERENCE_VECTOR_SCALAR_KEYS.every((k) => {
    const n = v[k];
    return (
      typeof n === "number" &&
      Number.isFinite(n) &&
      n >= 0 &&
      n <= 1
    );
  });
}

export function assertCoherenceVectorInvariants(
  value: CoherenceVector,
  decimals = COHERENCE_VECTOR_DECIMALS,
): void {
  if (!isCoherenceVector(value)) {
    throw new Error("Invalid CoherenceVector: expected finite normalized scalars in [0,1] and hash string.");
  }
  const expectedHash = computeCoherenceVectorHash(value, decimals);
  if (value.attractorSignatureHash !== expectedHash) {
    throw new Error(
      `Invalid CoherenceVector hash: expected ${expectedHash}, received ${value.attractorSignatureHash}`,
    );
  }
}
