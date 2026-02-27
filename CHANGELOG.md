# Changelog

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
