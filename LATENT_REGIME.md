# Latent Regime Observation

`@sigilnet/coherence` now includes an experimental ingress for model-internal
telemetry under `src/experimental/latent-regime.ts`.

This is not a new coherence ontology. It is a transport and composition seam
for observations and interventions that can be projected into the existing
coherence stack.

## What Was Added

- `LatentObservationEnvelope`
  - JSON-safe transport shape for probe outputs
- `buildLatentRegimeObservation(...)`
  - canonical observation builder from namespaced features + provenance
- `LatentRegimeObservation`
  - observational contract for hidden-state / attention / logit / perturbation
    metrics
- `composeLatentRegimeSummary(...)`
  - thin composition over existing coherence surfaces
- `LatentRegimeSummary`
  - composed summary that includes:
    - `CoherenceState`
    - `NcfSummary`
    - `ResonanceState`
    - optional `SystemEnergyState`
    - optional `GeometricInstabilityState`
    - optional `GeometricRegime`
    - optional `JSpaceResolution`
    - optional `StructuralPersistenceResult`
- `compareInterventionEffect(...)`
  - before/after deltas for comparable baseline vs perturbed observations
- `InterventionEffect`
  - comparison contract for perturbation studies

Current live Vera usage now spans three observational layers:

- decode shape
  - entropy
  - concentration
  - margin
- similarity / context
  - prompt-response similarity
  - cross-turn consistency
- internal representation
  - hidden-state drift
  - cross-layer similarity

## What This Is

Use this layer to detect and compare latent dynamical regimes correlated with:

- self-model stability
- cross-turn coherence
- context integration
- internal consistency under perturbation
- uncertainty responsiveness
- goal persistence
- degradation under masking, compression, or noise

This is intended as a model-dynamics / regime-analysis surface.

It is not:

- a consciousness detector
- a replacement for `NCF`, resonance, geometry, or J-space
- a special runtime path that downstream packages must depend on

## Where It Fits

The intended pipeline is:

1. A probe emits a `LatentObservationEnvelope`
2. `buildLatentRegimeObservation(...)` normalizes the observation
3. The observation is composed into existing coherence surfaces
4. `compareInterventionEffect(...)` compares baseline and perturbed runs

The existing coherence stack remains the meaning layer:

- `CoherenceState`
- `NcfSummary`
- `ResonanceState`
- `SystemEnergyState`
- `GeometricInstabilityState`
- `GeometricRegime`
- `JSpaceResolution`
- `StructuralPersistenceResult`

## Preferred Feature Keys

The builder recognizes namespaced keys such as:

- `hidden.drift.mean`
- `attention.entropy.mean`
- `residual.energy.mean`
- `logits.entropy.mean`
- `similarity.cross_layer.mean`
- `consistency.cross_turn.mean`
- `self.stability.score`
- `context.integration.score`
- `uncertainty.responsiveness.score`
- `goals.persistence.score`
- `perturbation.sensitivity.score`

Current live Vera emitters also use:

- `logits.concentration.mean`
- `logits.margin.mean`
- `similarity.prompt_response.cosine`
- `similarity.cross_turn.cosine`
- `hidden.state.drift.mean`
- `layers.cross_similarity.mean`

Aliases are supported, but these names should be treated as preferred canonical
keys for new emitters.

## Provenance vs Math

Core regime math should remain broadly model-agnostic.

Model/runtime properties such as:

- parameter count
- context window
- MoE vs dense
- instruct vs chat tuning
- quantization
- backend family

should generally live in `provenance` / `meta`, not be baked directly into the
coherence formulas.

Those fields matter for later stratification and interpretation, but they are
not themselves regime math.

## Placement Guidance

### Capture

Capture should happen as close to inference as possible, usually in
`packages/vera-torch`:

- around `/v1/chat/completions`
- around the backend-specific generation path in `vera_torch.flame.inference`
- or inside backend-specific probe hooks where hidden states / logits /
  attentions are actually available

### Composition / Policy

Composition, storage, policy, and visualization should happen in `vera`:

- ingest envelopes from `vera-torch`
- project them into coherence summaries
- treat them as advisory/model-state telemetry
- expose them to UIs, shell, or research tools

### UI

This is suitable for:

- campus timelines and debug panels
- shell operator-truth dev views
- intervention comparison UIs
- model bench / trial dashboards

## Suggested Visualization

Good first visualizations:

- trait bars:
  - integration
  - stability
  - persistence
  - fragmentation
  - recovery
- regime badges:
  - `ncf:*`
  - `resonance:*`
  - `energy:*`
  - `geometry:*`
  - `jspace:*`
- intervention deltas:
  - coherence up/down
  - resonance up/down
  - fragmentation up/down
- time series:
  - `M`, `R`, `entropy`, resonance score, instability

## Status

Experimental only.

This layer is intended to support:

- TS-native probes
- Python-side `vera-torch` probes
- perturbation studies
- cross-run regime comparisons

without creating a parallel coherence vocabulary.

Current live usage in the Vera stack includes:

- runtime-emitted envelopes from `vera-torch`
- native GGUF `logit entropy` where available
- cheap entropy-curve summaries
- cheap concentration / peakedness summaries
- cheap margin / decisiveness summaries
- embedding-based prompt/response similarity
- HF-backed hidden-state drift
- HF-backed cross-layer similarity
- Vera-side composition into latent-regime summaries
- shell-side debug visualization

## Interpreting Regimes

This layer is useful because it combines multiple kinds of evidence under one
state language.

- entropy down + concentration up + margin up + drift down + layer similarity up
  - cleaner regime
- entropy down + coherence down + drift up
  - overconfident collapse
- entropy up + concentration down + drift up + fragmentation up
  - unstable / diffuse regime
- high margin + high concentration + low similarity
  - decisive decoding with weak internal agreement

The aim is not to treat entropy as good or bad in isolation. The aim is to
check whether decode-shape, similarity, and internal probes move together in a
coherent way.

What it does not yet imply:

- a full hidden-state observability stack
- attention-native regime probes across all backends
- a finalized public package contract for these experimental surfaces
