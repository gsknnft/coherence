# @sigilnet/coherence

Typed coherence math and regime-analysis primitives for the Sigilnet stack.

`@sigilnet/coherence` is the canonical package for:

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

- root package exports via `@sigilnet/coherence`
- browser-safe bundle via `@sigilnet/coherence/browser`
- governance helpers via `@sigilnet/coherence/governance/*`
- regime helpers via `@sigilnet/coherence/regime/*`
- dynamics helpers via `@sigilnet/coherence/dynamics/*`
- geometric fitting via `@sigilnet/coherence/superformula`

## Naming

Terminology is intentionally split:

- `posterior entropy`: Bayesian uncertainty
- `spectral negentropy index (SNI)`: finite-window spectral coherence proxy
- `structural persistence index (SPI)`: persistence/certification-style score
- `structural complexity`: phase-space complexity proxies such as D2, drift,
  barrier behavior, and related dynamics metrics

Avoid collapsing those into one generic "entropy" metric.

## Status

Release status: pre-release / internal validation.

Current blockers before wider public release:

- verify export contract and tarball contents with `pnpm pack --json`
- complete README/API examples for the main exports
- finalize naming and docs around `SNI` / `SPI`
- validate release confidence on real traces and regression fixtures
- resolve downstream consumer validation in `@gsknnft/qwormhole`

## Package Contract

Public release should treat the following as the supported contract:

- `@sigilnet/coherence`
- `@sigilnet/coherence/browser`
- `@sigilnet/coherence/contracts`
- `@sigilnet/coherence/geometric-regime`
- `@sigilnet/coherence/superformula`
- `@sigilnet/coherence/fitj`
- `@sigilnet/coherence/invariants`
- `@sigilnet/coherence/invariants-lite`
- `@sigilnet/coherence/ncf`
- `@sigilnet/coherence/attractors`
- `@sigilnet/coherence/attractors/*`
- `@sigilnet/coherence/governance/*`
- `@sigilnet/coherence/regime/*`
- `@sigilnet/coherence/dynamics/*`

Anything else should be treated as internal and unstable until the package is
actually published and versioned in the wild.

## Install

Release note: this package is not yet publicly published/stable. Until that
changes, consume it from the workspace/monorepo rather than treating npm
install docs as final external guidance.

```bash
pnpm add @sigilnet/coherence
```

## Build

```bash
pnpm --filter @sigilnet/coherence run build
```

## Test

```bash
pnpm --filter @sigilnet/coherence run test
```

## Key APIs

```ts
import {
  computeSpectralNegentropyIndex,
  spectralNegentropyDelta,
  evaluateStructuralPersistence,
} from "@sigilnet/coherence";
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
