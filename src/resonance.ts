import type {
  ResonanceContributor,
  ResonancePhase,
  ResonanceSource,
  ResonanceState,
} from "./types.js";

const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export function classifyResonancePhase(score: number): ResonancePhase {
  const normalized = clamp01(score);
  if (normalized >= 0.8) return "coherent";
  if (normalized >= 0.55) return "drifting";
  if (normalized >= 0.3) return "dissonant";
  return "critical";
}

export function normalizeResonanceContributors(
  contributors: ResonanceContributor[],
): ResonanceContributor[] {
  const totalWeight =
    contributors.reduce((sum, contributor) => sum + contributor.weight, 0) || 1;
  return contributors.map((contributor) => ({
    ...contributor,
    value: clamp01(contributor.value),
    weight: contributor.weight / totalWeight,
  }));
}

export function resolveResonanceSource(
  sources: readonly ResonanceSource[],
): ResonanceSource {
  const unique = Array.from(new Set(sources));
  if (!unique.length) return "world";
  if (unique.length === 1) return unique[0];
  return "hybrid";
}

export function createResonanceState(input: {
  alignment: number;
  drift: number;
  energy: number;
  confidence?: number;
  source: ResonanceSource;
  contributors?: ResonanceContributor[];
  ts?: number;
}): ResonanceState {
  const alignment = clamp01(input.alignment);
  const drift = clamp01(input.drift);
  const energy = clamp01(input.energy);
  const confidence = clamp01(input.confidence ?? 0.5);

  // Alignment is primary. Drift and scattered field energy damp it.
  const score = clamp01(alignment * (1 - 0.6 * drift) * (1 - 0.4 * energy));

  return {
    score,
    alignment,
    drift,
    energy,
    confidence,
    phase: classifyResonancePhase(score),
    source: input.source,
    contributors: input.contributors
      ? normalizeResonanceContributors(input.contributors)
      : undefined,
    ts: input.ts,
  };
}
