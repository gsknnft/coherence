# Changelog

## 0.2.0 - 2026-04-01

- Added the latent-regime and Orch-OR experimental exports for publishable ESM builds.
- Added resonance, system-energy, and geometric-instability to the documented package contract.
- Switched package builds onto `tsconfig.build.json` for clean ESM output while keeping `tsconfig.json` no-emit for development.
- Included `LATENT_REGIME.md` in the published tarball so README references resolve for npm consumers.
- Relaxed the metastability regression assertion to match the actual structural persistence gate threshold.

## Unreleased

- Added first package-level release docs and clarified public terminology:
  - `SNI` = spectral negentropy index
  - `SPI` = structural persistence index
- Marked package as pre-release / internal validation pending wider public
  release.
- Release blockers documented in the README so downstream consumers understand
  current confidence boundaries.
- Tightened release-prep export contract and added explicit supported subpaths
  for `browser`, `contracts`, `fitj`, `invariants`, `invariants-lite`, `ncf`,
  and `attractors`.
- Public release remains blocked on downstream validation and real-trace
  confidence, not package metadata alone.
