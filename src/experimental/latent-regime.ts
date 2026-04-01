import type { GeometricRegime } from "../geometric-regime.js";
import type { GeometricInstabilityState, JSpaceResolution } from "../types.js";
import { deriveNcfSummary, type NcfSummary } from "../ncf.js";
import { createResonanceState } from "../resonance.js";
import { computeHorizonSec } from "../invariants-lite.js";
import { resolveSystemEnergy } from "../system-energy.js";
import type {
  ResonanceSource,
  ResonanceState,
  CoherenceState,
  SystemEnergyState,
} from "../types.js";
import type { StructuralPersistenceResult } from "../governance/persistence.js";

const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

const mean = (values: Array<number | null | undefined>, fallback = 0.5): number => {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  if (!finite.length) return fallback;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
};

export interface LatentSpan {
  start?: number;
  end?: number;
}

export interface LatentObservationEvidence {
  spectral?: Record<string, number>;
  temporal?: Record<string, number>;
  similarity?: Record<string, number>;
  diagnostics?: string[];
}

export interface LatentObservationProvenance {
  pipeline?: string;
  probe?: string;
  modelId?: string;
  interventionId?: string;
  notes?: string[];
  tags?: string[];
  meta?: Record<string, JsonScalar>;
}

export interface LatentRegimeObservation {
  source: string;
  ts?: number;
  sampleCount?: number;
  turnId?: string;
  promptId?: string;
  layerSpan?: LatentSpan;
  tokenSpan?: LatentSpan;
  hiddenStateDrift?: number | null;
  attentionEntropy?: number | null;
  residualEnergy?: number | null;
  logitEntropy?: number | null;
  crossLayerSimilarity?: number | null;
  crossTurnConsistency?: number | null;
  selfModelStability?: number | null;
  contextIntegration?: number | null;
  uncertaintyResponsiveness?: number | null;
  goalPersistence?: number | null;
  perturbationSensitivity?: number | null;
  features?: Record<string, number>;
  evidence?: LatentObservationEvidence;
  provenance?: LatentObservationProvenance;
}

export type LatentObservationFeatureBag = Record<string, number>;

export type JsonScalar = string | number | boolean | null;

export type JsonNumberMap = Record<string, number>;

export interface BuildLatentRegimeObservationInput {
  source: string;
  ts?: number;
  sampleCount?: number;
  turnId?: string;
  promptId?: string;
  layerSpan?: LatentSpan;
  tokenSpan?: LatentSpan;
  features?: LatentObservationFeatureBag;
  evidence?: LatentObservationEvidence;
  provenance?: LatentObservationProvenance;
  overrides?: Partial<Omit<LatentRegimeObservation, "source" | "features" | "evidence" | "provenance">>;
}

export interface LatentObservationEnvelope {
  source: string;
  ts?: number;
  sampleCount?: number;
  turnId?: string;
  promptId?: string;
  layerSpan?: LatentSpan;
  tokenSpan?: LatentSpan;
  features?: JsonNumberMap;
  evidence?: {
    spectral?: JsonNumberMap;
    temporal?: JsonNumberMap;
    similarity?: JsonNumberMap;
    diagnostics?: string[];
  };
  provenance?: {
    pipeline?: string;
    probe?: string;
    modelId?: string;
    interventionId?: string;
    notes?: string[];
    tags?: string[];
    meta?: Record<string, JsonScalar>;
  };
  overrides?: Partial<{
    hiddenStateDrift: number | null;
    attentionEntropy: number | null;
    residualEnergy: number | null;
    logitEntropy: number | null;
    crossLayerSimilarity: number | null;
    crossTurnConsistency: number | null;
    selfModelStability: number | null;
    contextIntegration: number | null;
    uncertaintyResponsiveness: number | null;
    goalPersistence: number | null;
    perturbationSensitivity: number | null;
  }>;
}

export interface LatentRegimeTraits {
  integration: number;
  stability: number;
  persistence: number;
  fragmentation: number;
  recovery: number;
}

export interface LatentRegimeSummary {
  source: string;
  observation?: LatentRegimeObservation;
  coherence: CoherenceState;
  ncf: NcfSummary;
  resonance: ResonanceState;
  energy?: SystemEnergyState;
  instability?: GeometricInstabilityState;
  geometricRegime?: GeometricRegime;
  jSpace?: JSpaceResolution;
  persistence?: StructuralPersistenceResult;
  traits: LatentRegimeTraits;
  labels: string[];
}

export interface InterventionDescriptor {
  kind: string;
  label?: string;
  source?: string;
  params?: Record<string, string | number | boolean | null>;
}

export interface InterventionEffectDeltas {
  coherence: number;
  entropy: number;
  resonance: number;
  stability: number;
  fragmentation: number;
  recovery: number;
}

export interface InterventionEffect {
  intervention: InterventionDescriptor;
  baseline: LatentRegimeSummary;
  perturbed: LatentRegimeSummary;
  comparable: boolean;
  deltas: InterventionEffectDeltas;
  labels: string[];
}

export interface ComposeLatentRegimeSummaryInput {
  source: string;
  observation?: LatentRegimeObservation;
  coherence: CoherenceState;
  ncf: NcfSummary;
  resonance: ResonanceState;
  energy?: SystemEnergyState;
  instability?: GeometricInstabilityState;
  geometricRegime?: GeometricRegime;
  jSpace?: JSpaceResolution;
  persistence?: StructuralPersistenceResult;
}

export interface ProjectLatentRegimeSummaryInput {
  source?: string;
  observation: LatentRegimeObservation;
  resonanceSource?: ResonanceSource;
}

const OBSERVATION_FEATURE_ALIASES = {
  hiddenStateDrift: ["hidden.drift.mean", "hidden.drift", "state.drift"],
  attentionEntropy: [
    "attention.entropy.mean",
    "attention.entropy",
    "attn.entropy.mean",
  ],
  residualEnergy: ["residual.energy.mean", "residual.energy", "state.energy"],
  logitEntropy: ["logits.entropy.mean", "logits.entropy", "logit.entropy"],
  crossLayerSimilarity: [
    "similarity.cross_layer.mean",
    "similarity.cross_layer",
    "layers.similarity.mean",
  ],
  crossTurnConsistency: [
    "consistency.cross_turn.mean",
    "consistency.cross_turn",
    "turn.consistency",
  ],
  selfModelStability: [
    "self.stability.score",
    "self_model.stability",
    "identity.stability",
  ],
  contextIntegration: [
    "context.integration.score",
    "context.integration",
    "integration.context",
  ],
  uncertaintyResponsiveness: [
    "uncertainty.responsiveness.score",
    "uncertainty.responsiveness",
    "uncertainty.response",
  ],
  goalPersistence: [
    "goals.persistence.score",
    "goal.persistence",
    "persistence.goal",
  ],
  perturbationSensitivity: [
    "perturbation.sensitivity.score",
    "perturbation.sensitivity",
    "noise.sensitivity",
  ],
} satisfies Record<
  keyof Pick<
    LatentRegimeObservation,
    | "hiddenStateDrift"
    | "attentionEntropy"
    | "residualEnergy"
    | "logitEntropy"
    | "crossLayerSimilarity"
    | "crossTurnConsistency"
    | "selfModelStability"
    | "contextIntegration"
    | "uncertaintyResponsiveness"
    | "goalPersistence"
    | "perturbationSensitivity"
  >,
  string[]
>;

function finiteOrNull(value: number | null | undefined): number | null {
  return Number.isFinite(value) ? (value as number) : null;
}

function pickFeature(
  features: LatentObservationFeatureBag | undefined,
  keys: readonly string[],
): number | null {
  if (!features) return null;
  for (const key of keys) {
    const value = features[key];
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function normalizeFeatureBag(
  features: LatentObservationFeatureBag | undefined,
): LatentObservationFeatureBag | undefined {
  if (!features) return undefined;
  const normalized = Object.fromEntries(
    Object.entries(features).filter(([, value]) => Number.isFinite(value)),
  );
  return Object.keys(normalized).length ? normalized : undefined;
}

function sameSpan(a?: LatentSpan, b?: LatentSpan): boolean {
  if (!a || !b) return true;
  return a.start === b.start && a.end === b.end;
}

function sameOptionalValue(a?: string, b?: string): boolean {
  if (a === undefined || b === undefined) return true;
  return a === b;
}

function areObservationsComparable(
  baseline?: LatentRegimeObservation,
  perturbed?: LatentRegimeObservation,
): boolean {
  if (!baseline || !perturbed) return true;
  return (
    baseline.source === perturbed.source &&
    sameOptionalValue(baseline.promptId, perturbed.promptId) &&
    sameOptionalValue(baseline.turnId, perturbed.turnId) &&
    sameOptionalValue(baseline.provenance?.modelId, perturbed.provenance?.modelId) &&
    sameOptionalValue(baseline.provenance?.probe, perturbed.provenance?.probe) &&
    sameSpan(baseline.layerSpan, perturbed.layerSpan) &&
    sameSpan(baseline.tokenSpan, perturbed.tokenSpan)
  );
}

export function buildLatentRegimeObservation(
  input: BuildLatentRegimeObservationInput,
): LatentRegimeObservation {
  const features = normalizeFeatureBag(input.features);
  const overrides = input.overrides ?? {};

  return {
    source: input.source,
    ts: input.ts,
    sampleCount: input.sampleCount,
    turnId: input.turnId,
    promptId: input.promptId,
    layerSpan: input.layerSpan,
    tokenSpan: input.tokenSpan,
    hiddenStateDrift:
      finiteOrNull(overrides.hiddenStateDrift) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.hiddenStateDrift),
    attentionEntropy:
      finiteOrNull(overrides.attentionEntropy) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.attentionEntropy),
    residualEnergy:
      finiteOrNull(overrides.residualEnergy) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.residualEnergy),
    logitEntropy:
      finiteOrNull(overrides.logitEntropy) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.logitEntropy),
    crossLayerSimilarity:
      finiteOrNull(overrides.crossLayerSimilarity) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.crossLayerSimilarity),
    crossTurnConsistency:
      finiteOrNull(overrides.crossTurnConsistency) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.crossTurnConsistency),
    selfModelStability:
      finiteOrNull(overrides.selfModelStability) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.selfModelStability),
    contextIntegration:
      finiteOrNull(overrides.contextIntegration) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.contextIntegration),
    uncertaintyResponsiveness:
      finiteOrNull(overrides.uncertaintyResponsiveness) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.uncertaintyResponsiveness),
    goalPersistence:
      finiteOrNull(overrides.goalPersistence) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.goalPersistence),
    perturbationSensitivity:
      finiteOrNull(overrides.perturbationSensitivity) ??
      pickFeature(features, OBSERVATION_FEATURE_ALIASES.perturbationSensitivity),
    features,
    evidence: input.evidence,
    provenance: input.provenance,
  };
}

export function observationEnvelopeToInput(
  envelope: LatentObservationEnvelope,
): BuildLatentRegimeObservationInput {
  return {
    source: envelope.source,
    ts: envelope.ts,
    sampleCount: envelope.sampleCount,
    turnId: envelope.turnId,
    promptId: envelope.promptId,
    layerSpan: envelope.layerSpan,
    tokenSpan: envelope.tokenSpan,
    features: envelope.features,
    evidence: envelope.evidence,
    provenance: envelope.provenance,
    overrides: envelope.overrides,
  };
}

export function buildLatentRegimeObservationFromEnvelope(
  envelope: LatentObservationEnvelope,
): LatentRegimeObservation {
  return buildLatentRegimeObservation(observationEnvelopeToInput(envelope));
}

export function projectLatentRegimeSummaryFromObservation(
  input: ProjectLatentRegimeSummaryInput,
): LatentRegimeSummary {
  const observation = input.observation;
  const coherence = clamp01(
    mean(
      [
        observation.crossLayerSimilarity ?? null,
        observation.crossTurnConsistency ?? null,
        observation.selfModelStability ?? null,
        observation.contextIntegration ?? null,
        observation.attentionEntropy != null ? 1 - clamp01(observation.attentionEntropy) : null,
        observation.logitEntropy != null ? 1 - clamp01(observation.logitEntropy) : null,
      ],
      0.5,
    ),
  );
  const drift = clamp01(Math.abs(observation.hiddenStateDrift ?? 0));
  const reserve = clamp01(
    mean(
      [
        observation.goalPersistence ?? null,
        observation.uncertaintyResponsiveness ?? null,
        observation.perturbationSensitivity != null
          ? 1 - clamp01(observation.perturbationSensitivity)
          : null,
        coherence,
      ],
      coherence,
    ),
  );
  const entropy = clamp01(
    mean(
      [
        observation.attentionEntropy ?? null,
        observation.logitEntropy ?? null,
        observation.perturbationSensitivity ?? null,
        observation.residualEnergy ?? null,
        1 - coherence,
      ],
      1 - coherence,
    ),
  );
  const negentropy = clamp01(
    mean(
      [
        1 - entropy,
        coherence,
        observation.goalPersistence ?? null,
      ],
      coherence,
    ),
  );
  const alignment = clamp01(
    mean(
      [
        observation.crossLayerSimilarity ?? null,
        observation.contextIntegration ?? null,
        observation.selfModelStability ?? null,
        coherence,
      ],
      coherence,
    ),
  );
  const scatteredEnergy = clamp01(
    mean(
      [
        observation.residualEnergy ?? null,
        observation.perturbationSensitivity ?? null,
        entropy,
      ],
      entropy,
    ),
  );

  const primitives: CoherenceState = {
    M: coherence,
    V: observation.hiddenStateDrift ?? 0,
    R: reserve,
    H: computeHorizonSec(coherence, observation.hiddenStateDrift ?? 0, reserve),
    confidence: clamp01(
      mean(
        [
          observation.sampleCount != null
            ? clamp01(Math.min(observation.sampleCount, 64) / 64)
            : null,
          observation.provenance?.probe ? 1 : null,
          observation.provenance?.modelId ? 1 : null,
        ],
        0.6,
      ),
    ),
  };

  const ncf = deriveNcfSummary({
    coherence,
    entropy,
    negentropy,
    entropyVelocity: observation.hiddenStateDrift ?? 0,
  });

  const resonance = createResonanceState({
    alignment,
    drift,
    energy: scatteredEnergy,
    confidence: primitives.confidence,
    source: input.resonanceSource ?? "coherence",
    ts: observation.ts,
  });

  const energy = resolveSystemEnergy({
    pressure: observation.perturbationSensitivity ?? observation.residualEnergy ?? entropy,
    instability: drift,
    entropy,
    resonance: resonance.score,
  });

  return composeLatentRegimeSummary({
    source: input.source ?? "latent-regime",
    observation,
    coherence: primitives,
    ncf,
    resonance,
    energy,
  });
}

export function projectLatentRegimeSummaryFromEnvelope(input: {
  source?: string;
  envelope: LatentObservationEnvelope;
  resonanceSource?: ResonanceSource;
}): LatentRegimeSummary {
  return projectLatentRegimeSummaryFromObservation({
    source: input.source,
    observation: buildLatentRegimeObservationFromEnvelope(input.envelope),
    resonanceSource: input.resonanceSource,
  });
}

export function composeLatentRegimeSummary(
  input: ComposeLatentRegimeSummaryInput,
): LatentRegimeSummary {
  const integration = clamp01(
    mean([
      input.observation?.contextIntegration ?? null,
      input.observation?.crossLayerSimilarity ?? null,
      input.coherence.M,
      input.ncf.coherence,
      input.resonance.alignment,
    ]),
  );

  const stability = clamp01(
    mean([
      input.observation?.selfModelStability ?? null,
      input.observation?.crossTurnConsistency ?? null,
      input.energy?.stabilityMargin ?? null,
      input.instability ? 1 - input.instability.instability : null,
      input.jSpace?.resolved === true ? 1 : input.jSpace?.resolved === false ? 0 : null,
      input.persistence?.score ?? null,
    ]),
  );

  const persistence = clamp01(
    mean([
      input.observation?.goalPersistence ?? null,
      input.observation?.crossTurnConsistency ?? null,
      input.ncf.negentropy,
      input.jSpace?.basinHoldMet === true ? 1 : input.jSpace?.basinHoldMet === false ? 0 : null,
      input.persistence?.score ?? null,
    ]),
  );

  const fragmentation = clamp01(
    mean([
      input.observation?.perturbationSensitivity ?? null,
      input.ncf.entropy,
      input.resonance.drift,
      input.instability?.instability ?? null,
      input.energy ? 1 - input.energy.stabilityMargin : null,
    ]),
  );

  const recovery = clamp01(
    mean([
      input.observation?.uncertaintyResponsiveness ?? null,
      input.coherence.R,
      input.persistence ? 1 - input.persistence.metastability : null,
      input.jSpace?.basinHoldMet === true ? 1 : input.jSpace?.basinHoldMet === false ? 0 : null,
      input.energy?.stabilityMargin ?? null,
    ]),
  );

  const labels = [
    `ncf:${input.ncf.regime}`,
    `resonance:${input.resonance.phase}`,
    input.energy ? `energy:${input.energy.band}` : null,
    input.geometricRegime ? `geometry:${input.geometricRegime.regime}` : null,
    input.jSpace?.resolved === true ? "jspace:resolved" : null,
    input.jSpace?.resolved === false ? "jspace:unresolved" : null,
    input.persistence?.gatePassed === true ? "persistence:passed" : null,
    input.persistence?.gatePassed === false ? "persistence:blocked" : null,
  ].filter((label): label is string => Boolean(label));

  return {
    source: input.source,
    observation: input.observation,
    coherence: input.coherence,
    ncf: input.ncf,
    resonance: input.resonance,
    energy: input.energy,
    instability: input.instability,
    geometricRegime: input.geometricRegime,
    jSpace: input.jSpace,
    persistence: input.persistence,
    traits: {
      integration,
      stability,
      persistence,
      fragmentation,
      recovery,
    },
    labels,
  };
}

export function compareInterventionEffect(input: {
  intervention: InterventionDescriptor;
  baseline: LatentRegimeSummary;
  perturbed: LatentRegimeSummary;
}): InterventionEffect {
  const baseline = input.baseline;
  const perturbed = input.perturbed;
  const deltas: InterventionEffectDeltas = {
    coherence: perturbed.coherence.M - baseline.coherence.M,
    entropy: perturbed.ncf.entropy - baseline.ncf.entropy,
    resonance: perturbed.resonance.score - baseline.resonance.score,
    stability: perturbed.traits.stability - baseline.traits.stability,
    fragmentation: perturbed.traits.fragmentation - baseline.traits.fragmentation,
    recovery: perturbed.traits.recovery - baseline.traits.recovery,
  };

  const labels = [
    deltas.coherence >= 0.05 ? "coherence:up" : deltas.coherence <= -0.05 ? "coherence:down" : null,
    deltas.resonance >= 0.05 ? "resonance:up" : deltas.resonance <= -0.05 ? "resonance:down" : null,
    deltas.stability >= 0.05 ? "stability:up" : deltas.stability <= -0.05 ? "stability:down" : null,
    deltas.fragmentation >= 0.05
      ? "fragmentation:up"
      : deltas.fragmentation <= -0.05
        ? "fragmentation:down"
        : null,
    deltas.recovery >= 0.05 ? "recovery:up" : deltas.recovery <= -0.05 ? "recovery:down" : null,
  ].filter((label): label is string => Boolean(label));

  return {
    intervention: input.intervention,
    baseline,
    perturbed,
    comparable: areObservationsComparable(baseline.observation, perturbed.observation),
    deltas,
    labels,
  };
}
