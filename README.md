# @gsknnft/coherence

Typed coherence math and regime-analysis primitives for the Sigilnet stack.

`@gsknnft/coherence` is the canonical package for:

- spectral negentropy / coherence-density metrics
- structural persistence (`SPI`) evaluation
- drift, Lorentz-style governance, and regime support utilities
- attractor and geometric-regime helpers
- Bayesian regime filtering

This package is intended to hold the reusable math and decision contracts that
other packages consume. Transports like `@gsknnft/qwormhole` should treat it as
the authoritative coherence layer rather than maintaining divergent runtime math.

## Scope

Current exported surfaces include:

- root package exports via `@gsknnft/coherence`
- browser-safe bundle via `@gsknnft/coherence/browser`
- governance helpers via `@gsknnft/coherence/governance/*`
- regime helpers via `@gsknnft/coherence/regime/*`
- dynamics helpers via `@gsknnft/coherence/dynamics/*`
- geometric fitting via `@gsknnft/coherence/superformula`
- resonance / system-energy / geometric-instability primitives
- experimental latent-regime ingress via `@gsknnft/coherence/experimental/latent-regime`
- experimental Orch-OR projection via `@gsknnft/coherence/experimental/orch-or`

## Naming

Terminology is intentionally split:

- `posterior entropy`: Bayesian uncertainty
- `spectral negentropy index (SNI)`: finite-window spectral coherence proxy
- `structural persistence index (SPI)`: persistence/certification-style score
- `structural complexity`: phase-space complexity proxies such as D2, drift,
  barrier behavior, and related dynamics metrics

Avoid collapsing those into one generic "entropy" metric.

## Status

Release status: published 0.x package with an explicitly narrow contract.

Compatibility expectations for consumers:

- minor releases may add new primitives while the package remains in `0.x`
- experimental subpaths are published, but should still be treated as less stable than the root contract
- downstream validation in `@gsknnft/qwormhole` and Vera remains the main confidence signal for wider adoption

## Package Contract

Public release should treat the following as the supported contract:

- `@gsknnft/coherence`
- `@gsknnft/coherence/browser`
- `@gsknnft/coherence/contracts`
- `@gsknnft/coherence/resonance`
- `@gsknnft/coherence/system-energy`
- `@gsknnft/coherence/geometric-instability`
- `@gsknnft/coherence/geometric-regime`
- `@gsknnft/coherence/superformula`
- `@gsknnft/coherence/fitj`
- `@gsknnft/coherence/invariants`
- `@gsknnft/coherence/invariants-lite`
- `@gsknnft/coherence/ncf`
- `@gsknnft/coherence/attractors`
- `@gsknnft/coherence/attractors/*`
- `@gsknnft/coherence/governance/*`
- `@gsknnft/coherence/regime/*`
- `@gsknnft/coherence/dynamics/*`
- `@gsknnft/coherence/experimental/latent-regime`
- `@gsknnft/coherence/experimental/orch-or`

Anything else should be treated as internal and unstable until the package is
actually published and versioned in the wild.

## Install

Release note: this package is published under `0.x` semantics. Pin explicit
versions if you depend on experimental subpaths or recently added contracts.

```bash
pnpm add @gsknnft/coherence
```

## Build

```bash
pnpm --filter @gsknnft/coherence run build
```

## Test

```bash
pnpm --filter @gsknnft/coherence run test
```

## Key APIs

```ts
import {
  computeSpectralNegentropyIndex,
  spectralNegentropyDelta,
  evaluateStructuralPersistence,
} from "@gsknnft/coherence";
```

`computeSpectralNegentropyIndex(...)`

- computes a bounded finite-window spectral coherence proxy

`evaluateStructuralPersistence(...)`

- computes persistence score, metastability, and gate result across a rolling
  observation window

## Notes

- This package is `type: module`.
- Browser and Node entrypoints are separated through package exports.
- Consumers should pin to explicit versions once the first stable public release
  lands.
- QWormhole is currently the main downstream validation consumer. Until its
  coherence-facing imports and benches are settled, treat the package contract
  as pre-release.
- Experimental latent-regime ingress is documented in
  [LATENT_REGIME.md](./LATENT_REGIME.md).
- In the current Vera stack, that latent-regime ingress is already being used as
  a live telemetry/composition seam for runtime-emitted LLM regime metrics.
- Current live regime inputs in Vera now include:
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
