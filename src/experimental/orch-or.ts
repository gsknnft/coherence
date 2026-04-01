import { deriveNcfSummary, type NcfSummary } from "../ncf.js";
import { computeHorizonSec, clamp01 } from "../invariants-lite.js";
import { createResonanceState } from "../resonance.js";
import type {
  CoherenceState,
  ResonanceContributor,
  ResonanceState,
} from "../types.js";

export type ExperimentalProjectionRegime =
  | "baseline"
  | "perturbed-coherence"
  | "suppressed-coherence";

export interface ExperimentalOrchOrInput {
  coherence?: number | null;
  entropy?: number | null;
  negentropy?: number | null;
  drift?: number | null;
  reserve?: number | null;
  alignment?: number | null;
  energy?: number | null;
  confidence?: number | null;
  contributors?: ResonanceContributor[] | null;
  ts?: number | null;
  regimeHint?: ExperimentalProjectionRegime | null;
}

export interface ExperimentalOrchOrProjection {
  source: "experimental-orch-or";
  regime: ExperimentalProjectionRegime;
  primitives: CoherenceState;
  resonance: ResonanceState;
  ncf: NcfSummary;
  diagnostics: string[];
}

function finiteOrUndefined(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resolveCoherence(input: ExperimentalOrchOrInput): number {
  const direct = finiteOrUndefined(input.coherence);
  if (direct !== undefined) return clamp01(direct);

  const negentropy = finiteOrUndefined(input.negentropy);
  if (negentropy !== undefined) return clamp01(negentropy);

  const entropy = finiteOrUndefined(input.entropy);
  if (entropy !== undefined) return clamp01(1 - entropy);

  return 0.5;
}

function resolveEntropy(input: ExperimentalOrchOrInput, coherence: number): number {
  const direct = finiteOrUndefined(input.entropy);
  if (direct !== undefined) return clamp01(direct);
  return clamp01(1 - coherence);
}

function resolveNegentropy(input: ExperimentalOrchOrInput, entropy: number): number {
  const direct = finiteOrUndefined(input.negentropy);
  if (direct !== undefined) return clamp01(direct);
  return clamp01(1 - entropy);
}

export function classifyExperimentalProjectionRegime(input: {
  coherence: number;
  resonanceScore: number;
  hint?: ExperimentalProjectionRegime | null;
}): ExperimentalProjectionRegime {
  if (input.hint) return input.hint;
  if (input.coherence < 0.35 || input.resonanceScore < 0.3) {
    return "suppressed-coherence";
  }
  if (input.coherence < 0.65 || input.resonanceScore < 0.6) {
    return "perturbed-coherence";
  }
  return "baseline";
}

export function projectExperimentalOrchOrState(
  input: ExperimentalOrchOrInput,
): ExperimentalOrchOrProjection {
  const coherence = resolveCoherence(input);
  const entropy = resolveEntropy(input, coherence);
  const negentropy = resolveNegentropy(input, entropy);
  const drift = clamp01(Math.abs(finiteOrUndefined(input.drift) ?? 0));
  const signedDrift = finiteOrUndefined(input.drift) ?? 0;
  const reserve = clamp01(finiteOrUndefined(input.reserve) ?? negentropy);
  const confidence = clamp01(finiteOrUndefined(input.confidence) ?? 0.5);
  const alignment = clamp01(finiteOrUndefined(input.alignment) ?? coherence);
  const energy = clamp01(finiteOrUndefined(input.energy) ?? entropy);

  const primitives: CoherenceState = {
    M: coherence,
    V: signedDrift,
    R: reserve,
    H: computeHorizonSec(coherence, signedDrift, reserve),
    confidence,
  };

  const resonance = createResonanceState({
    alignment,
    drift,
    energy,
    confidence,
    source: "coherence",
    contributors: input.contributors ?? undefined,
    ts: finiteOrUndefined(input.ts),
  });

  const ncf = deriveNcfSummary({
    coherence,
    entropy,
    negentropy,
    entropyVelocity: signedDrift,
  });

  const diagnostics: string[] = [];
  if (finiteOrUndefined(input.coherence) === undefined) diagnostics.push("coherence_inferred");
  if (finiteOrUndefined(input.entropy) === undefined) diagnostics.push("entropy_inferred");
  if (finiteOrUndefined(input.negentropy) === undefined) diagnostics.push("negentropy_inferred");
  if (finiteOrUndefined(input.reserve) === undefined) diagnostics.push("reserve_inferred");

  return {
    source: "experimental-orch-or",
    regime: classifyExperimentalProjectionRegime({
      coherence,
      resonanceScore: resonance.score,
      hint: input.regimeHint ?? null,
    }),
    primitives,
    resonance,
    ncf,
    diagnostics,
  };
}
