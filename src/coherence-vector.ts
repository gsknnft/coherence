import {
  COHERENCE_VECTOR_DECIMALS,
  COHERENCE_VECTOR_DIGEST_PREFIX,
  COHERENCE_VECTOR_HASH_PREFIX,
  COHERENCE_VECTOR_SCALAR_KEYS,
} from "./types.js";
import type { CoherenceVectorScalars, CoherenceVector } from "./types.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export type CoherenceVectorHashVariant =
  | "cv1-canonical-fnv1a32"
  | "cv1-legacy-class-sha256-64"
  | "cv1-legacy-class-fnv1a64"
  | "invalid";

export interface CoherenceVectorHashRecognition {
  valid: boolean;
  variant: CoherenceVectorHashVariant;
  canonicalHash: string;
  migrationRequired: boolean;
}


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

function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}

function legacyClassSerialization(
  input: CoherenceVectorScalars,
  decimals = COHERENCE_VECTOR_DECIMALS,
): string {
  const v = normalizeCoherenceScalars(input, decimals);
  return COHERENCE_VECTOR_SCALAR_KEYS.map(
    (key) => `${key}=${v[key].toFixed(decimals)}`,
  ).join("|");
}

/** Hash emitted by CoherenceVectorClass before the July 2026 FNV change. */
export function computeLegacyClassSha256Hash(
  input: CoherenceVectorScalars,
  decimals = COHERENCE_VECTOR_DECIMALS,
): string {
  const digest = sha256(utf8ToBytes(legacyClassSerialization(input, decimals)));
  return `${COHERENCE_VECTOR_HASH_PREFIX}${bytesToHex(digest).slice(0, 16)}`;
}

/** Hash briefly emitted by CoherenceVectorClass under the same cv1 prefix. */
export function computeLegacyClassFnv1a64Hash(
  input: CoherenceVectorScalars,
  decimals = COHERENCE_VECTOR_DECIMALS,
): string {
  return `${COHERENCE_VECTOR_HASH_PREFIX}${fnv1a64(legacyClassSerialization(input, decimals))}`;
}

/**
 * Short fingerprint for a CoherenceVector. **Not an identifier.**
 *
 * FNV-1a-32 is a fine choice for what this is used for: cheaply noticing that
 * two vectors differ, labelling a value in a log, or eyeballing a record. It is
 * the wrong choice for identity, deduplication, or provenance, because 32 bits
 * is only ~4.3e9 values — by the birthday bound a collision becomes likely
 * around ~77,000 vectors, which is a plausible number of observations rather
 * than an astronomical one. Two unrelated coherence states sharing a
 * fingerprint is expected behaviour here, not a bug.
 *
 * When you need a value that can safely key a store, join two records, or
 * back a provenance claim, use {@link computeCoherenceVectorDigest}.
 *
 * The `cv1_` contract is frozen. A future algorithm must take a new version
 * prefix rather than silently changing what `cv1_` means.
 */
export function computeCoherenceVectorHash(
  input: CoherenceVectorScalars,
  decimals = COHERENCE_VECTOR_DECIMALS,
): string {
  const canonical = serializeCoherenceScalarsCanonical(input, decimals);
  return `${COHERENCE_VECTOR_HASH_PREFIX}${fnv1a32(canonical)}`;
}

/**
 * Durable identity digest for a CoherenceVector.
 *
 * Full SHA-256 over exactly the same canonical serialization that
 * {@link computeCoherenceVectorHash} fingerprints, so the two layers always
 * describe the same normalized scalars and can never disagree about what the
 * vector *is* — they differ only in collision resistance.
 *
 * Use this wherever a coherence identifier outlives the process that made it:
 * evidence records, store keys, dedup, cross-record joins, provenance. Prefer
 * it by default for anything persisted; the short fingerprint is for display
 * and cheap comparison.
 *
 * Emitted under the distinct `cvd1_` prefix so a digest is never mistaken for a
 * `cv1_` fingerprint, and so digests remain recognisable if the fingerprint
 * algorithm is ever versioned independently.
 */
export function computeCoherenceVectorDigest(
  input: CoherenceVectorScalars,
  decimals = COHERENCE_VECTOR_DECIMALS,
): string {
  const canonical = serializeCoherenceScalarsCanonical(input, decimals);
  return `${COHERENCE_VECTOR_DIGEST_PREFIX}${bytesToHex(sha256(utf8ToBytes(canonical)))}`;
}

/**
 * Recognize every hash format previously emitted as `cv1_`.
 *
 * New evidence always uses the original canonical JSON + FNV-1a-32 contract.
 * Legacy recognition is read compatibility only; a future algorithm must use a
 * new version prefix rather than silently changing cv1 again.
 */
export function recognizeCoherenceVectorHash(
  input: CoherenceVectorScalars,
  hash: string,
  decimals = COHERENCE_VECTOR_DECIMALS,
): CoherenceVectorHashRecognition {
  const canonicalHash = computeCoherenceVectorHash(input, decimals);
  if (hash === canonicalHash) {
    return {
      valid: true,
      variant: "cv1-canonical-fnv1a32",
      canonicalHash,
      migrationRequired: false,
    };
  }
  if (hash === computeLegacyClassSha256Hash(input, decimals)) {
    return {
      valid: true,
      variant: "cv1-legacy-class-sha256-64",
      canonicalHash,
      migrationRequired: true,
    };
  }
  if (hash === computeLegacyClassFnv1a64Hash(input, decimals)) {
    return {
      valid: true,
      variant: "cv1-legacy-class-fnv1a64",
      canonicalHash,
      migrationRequired: true,
    };
  }
  return {
    valid: false,
    variant: "invalid",
    canonicalHash,
    migrationRequired: false,
  };
}

export function migrateCoherenceVectorHash(
  input: CoherenceVectorScalars,
  hash: string,
  decimals = COHERENCE_VECTOR_DECIMALS,
): string {
  const recognition = recognizeCoherenceVectorHash(input, hash, decimals);
  if (!recognition.valid) {
    throw new Error(`Unrecognized CoherenceVector hash: ${hash}`);
  }
  return recognition.canonicalHash;
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
  const recognition = recognizeCoherenceVectorHash(
    value,
    value.attractorSignatureHash,
    decimals,
  );
  if (!recognition.valid) {
    throw new Error(
      `Invalid CoherenceVector hash: expected ${recognition.canonicalHash} or a recognized legacy cv1 hash, received ${value.attractorSignatureHash}`,
    );
  }
}
