import { describe, expect, it } from "vitest";
import {
  buildLatentRegimeObservation,
  buildLatentRegimeObservationFromEnvelope,
  compareInterventionEffect,
  composeLatentRegimeSummary,
  observationEnvelopeToInput,
  projectLatentRegimeSummaryFromEnvelope,
  type LatentRegimeObservation,
} from "../src/experimental/latent-regime.js";
import { deriveNcfSummary } from "../src/ncf.js";
import { createResonanceState } from "../src/resonance.js";

describe("latent regime contracts", () => {
  it("builds transport-safe observations from namespaced probe features", () => {
    const observation = buildLatentRegimeObservation({
      source: "probe:transformer",
      promptId: "prompt-1",
      turnId: "turn-7",
      layerSpan: { start: 10, end: 18 },
      tokenSpan: { start: 0, end: 64 },
      provenance: {
        modelId: "qwen-test",
        probe: "hidden-state-probe",
      },
      features: {
        "hidden.drift.mean": 0.14,
        "attention.entropy.mean": 0.41,
        "residual.energy.mean": 0.62,
        "similarity.cross_layer.mean": 0.83,
        "consistency.cross_turn.mean": 0.79,
        "self.stability.score": 0.74,
        "context.integration.score": 0.77,
        "uncertainty.responsiveness.score": 0.66,
        "goals.persistence.score": 0.72,
        "perturbation.sensitivity.score": 0.24,
        "ignored.non_numeric": Number.NaN,
      },
    });

    expect(observation.hiddenStateDrift).toBeCloseTo(0.14, 6);
    expect(observation.attentionEntropy).toBeCloseTo(0.41, 6);
    expect(observation.crossLayerSimilarity).toBeCloseTo(0.83, 6);
    expect(observation.goalPersistence).toBeCloseTo(0.72, 6);
    expect(observation.features?.["ignored.non_numeric"]).toBeUndefined();
    expect(observation.provenance?.probe).toBe("hidden-state-probe");
  });

  it("accepts a JSON-safe envelope as a shared interchange shape", () => {
    const envelope = {
      source: "probe:python",
      promptId: "prompt-json",
      turnId: "turn-json",
      layerSpan: { start: 4, end: 8 },
      tokenSpan: { start: 0, end: 32 },
      features: {
        "hidden.drift.mean": 0.11,
        "logits.entropy.mean": 0.37,
      },
      provenance: {
        pipeline: "vera-torch",
        probe: "python-hidden-probe",
        modelId: "gemma-test",
        tags: ["experimental", "json"],
        meta: {
          transport: "json",
          sample_rate_hz: 20,
          dry_run: true,
        },
      },
      overrides: {
        contextIntegration: 0.71,
      },
    } as const;

    const input = observationEnvelopeToInput(envelope);
    const observation = buildLatentRegimeObservationFromEnvelope(envelope);

    expect(input.source).toBe("probe:python");
    expect(input.features?.["hidden.drift.mean"]).toBeCloseTo(0.11, 6);
    expect(observation.hiddenStateDrift).toBeCloseTo(0.11, 6);
    expect(observation.logitEntropy).toBeCloseTo(0.37, 6);
    expect(observation.contextIntegration).toBeCloseTo(0.71, 6);
    expect(observation.provenance?.tags).toEqual(["experimental", "json"]);
    expect(observation.provenance?.meta?.transport).toBe("json");
  });

  it("projects an observation envelope into existing coherence surfaces", () => {
    const summary = projectLatentRegimeSummaryFromEnvelope({
      source: "latent-regime",
      envelope: {
        source: "probe:python",
        sampleCount: 24,
        features: {
          "hidden.drift.mean": 0.12,
          "attention.entropy.mean": 0.31,
          "logits.entropy.mean": 0.28,
          "similarity.cross_layer.mean": 0.82,
          "consistency.cross_turn.mean": 0.78,
          "self.stability.score": 0.76,
          "context.integration.score": 0.8,
          "goals.persistence.score": 0.74,
          "perturbation.sensitivity.score": 0.22,
        },
        provenance: {
          probe: "python-hidden-probe",
          modelId: "qwen-test",
        },
      },
    });

    expect(summary.coherence.M).toBeGreaterThan(0.65);
    expect(summary.ncf.regime).toBe("coherent");
    expect(summary.resonance.phase).not.toBe("critical");
    expect(summary.energy?.band).toMatch(/calm|attentive|caution/);
    expect(summary.labels).toContain("ncf:coherent");
  });

  it("composes a thin summary from existing coherence surfaces", () => {
    const observation: LatentRegimeObservation = {
      source: "probe:hidden-state",
      sampleCount: 32,
      layerSpan: { start: 8, end: 16 },
      tokenSpan: { start: 0, end: 64 },
      crossLayerSimilarity: 0.78,
      crossTurnConsistency: 0.81,
      selfModelStability: 0.76,
      contextIntegration: 0.74,
      uncertaintyResponsiveness: 0.69,
      goalPersistence: 0.73,
      perturbationSensitivity: 0.21,
    };

    const summary = composeLatentRegimeSummary({
      source: "latent-regime",
      observation,
      coherence: { M: 0.77, V: 0.05, R: 0.72, H: 14, confidence: 0.8 },
      ncf: deriveNcfSummary({ coherence: 0.77, entropy: 0.26, negentropy: 0.74 }),
      resonance: createResonanceState({
        alignment: 0.75,
        drift: 0.18,
        energy: 0.22,
        source: "coherence",
        confidence: 0.7,
      }),
      energy: {
        energy: 0.34,
        band: "attentive",
        stabilityMargin: 0.66,
        components: {
          pressure: 0.2,
          instability: 0.25,
          entropy: 0.26,
          latency: 0.18,
          resonanceLoss: 0.25,
        },
      },
      jSpace: {
        resolved: true,
        reasons: [],
        gradNorm: 0.001,
        lambdaMin: 0.12,
        deltaJViolationRate: 0.01,
        basinHoldMet: true,
      },
    });

    expect(summary.labels).toContain("ncf:coherent");
    expect(summary.labels).toContain("resonance:drifting");
    expect(summary.labels).toContain("energy:attentive");
    expect(summary.labels).toContain("jspace:resolved");
    expect(summary.traits.integration).toBeGreaterThan(0.7);
    expect(summary.traits.fragmentation).toBeLessThan(0.4);
    expect(summary.observation?.source).toBe("probe:hidden-state");
  });

  it("compares baseline and perturbed summaries without inventing a new regime enum", () => {
    const baseline = composeLatentRegimeSummary({
      source: "latent-regime",
      observation: buildLatentRegimeObservation({
        source: "probe:transformer",
        promptId: "prompt-1",
        turnId: "turn-7",
        layerSpan: { start: 10, end: 18 },
        tokenSpan: { start: 0, end: 64 },
        provenance: {
          modelId: "qwen-test",
          probe: "hidden-state-probe",
        },
      }),
      coherence: { M: 0.8, V: 0.03, R: 0.75, H: 18 },
      ncf: deriveNcfSummary({ coherence: 0.8, entropy: 0.22, negentropy: 0.78 }),
      resonance: createResonanceState({
        alignment: 0.81,
        drift: 0.12,
        energy: 0.2,
        source: "coherence",
      }),
    });

    const perturbed = composeLatentRegimeSummary({
      source: "latent-regime",
      observation: buildLatentRegimeObservation({
        source: "probe:transformer",
        promptId: "prompt-1",
        turnId: "turn-7",
        layerSpan: { start: 10, end: 18 },
        tokenSpan: { start: 0, end: 64 },
        provenance: {
          modelId: "qwen-test",
          probe: "hidden-state-probe",
        },
      }),
      coherence: { M: 0.52, V: 0.14, R: 0.44, H: 4 },
      ncf: deriveNcfSummary({ coherence: 0.52, entropy: 0.49, negentropy: 0.51 }),
      resonance: createResonanceState({
        alignment: 0.54,
        drift: 0.42,
        energy: 0.48,
        source: "coherence",
      }),
      energy: {
        energy: 0.68,
        band: "caution",
        stabilityMargin: 0.32,
        components: {
          pressure: 0.55,
          instability: 0.52,
          entropy: 0.49,
          latency: 0.3,
          resonanceLoss: 0.55,
        },
      },
    });

    const effect = compareInterventionEffect({
      intervention: {
        kind: "noise",
        label: "gaussian_noise",
        source: "experimental-probe",
      },
      baseline,
      perturbed,
    });

    expect(effect.comparable).toBe(true);
    expect(effect.deltas.coherence).toBeLessThan(0);
    expect(effect.deltas.resonance).toBeLessThan(0);
    expect(effect.deltas.fragmentation).toBeGreaterThan(0);
    expect(effect.labels).toContain("coherence:down");
    expect(effect.labels).toContain("fragmentation:up");
  });

  it("marks interventions non-comparable when probe context differs", () => {
    const baseline = composeLatentRegimeSummary({
      source: "latent-regime",
      observation: buildLatentRegimeObservation({
        source: "probe:transformer",
        promptId: "prompt-1",
        provenance: { modelId: "model-a", probe: "probe-a" },
      }),
      coherence: { M: 0.7, V: 0.02, R: 0.7, H: 12 },
      ncf: deriveNcfSummary({ coherence: 0.7, entropy: 0.3, negentropy: 0.7 }),
      resonance: createResonanceState({
        alignment: 0.72,
        drift: 0.18,
        energy: 0.24,
        source: "coherence",
      }),
    });

    const perturbed = composeLatentRegimeSummary({
      source: "latent-regime",
      observation: buildLatentRegimeObservation({
        source: "probe:transformer",
        promptId: "prompt-2",
        provenance: { modelId: "model-b", probe: "probe-b" },
      }),
      coherence: { M: 0.6, V: 0.08, R: 0.58, H: 8 },
      ncf: deriveNcfSummary({ coherence: 0.6, entropy: 0.4, negentropy: 0.6 }),
      resonance: createResonanceState({
        alignment: 0.61,
        drift: 0.28,
        energy: 0.34,
        source: "coherence",
      }),
    });

    const effect = compareInterventionEffect({
      intervention: { kind: "masking" },
      baseline,
      perturbed,
    });

    expect(effect.comparable).toBe(false);
  });
});
