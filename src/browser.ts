// Browser-safe coherence facade.
// Intentionally avoids the root barrel, which pulls server/node-oriented modules.

export {
  computeAttractor,
  computeAizawa,
  computeLorenz,
  computeRossler,
  projectToPolar,
  type AttractorType,
} from "./attractors/index.js";
export {
  compareToAttractors,
  REFERENCE_SIGNATURES,
  type CompareToAttractorsOptions,
} from "./attractors/comparison.js";
export { isJSpaceResolved, bindGeometryOps } from "./jSpaceResolution.js";
export {
  evaluateGeometricRegime,
  buildGeometricRegimeInputs,
  classifyGeometricRegime,
  classifyGeometricRegimeEngine,
  type GeometricRegime,
  type GeometricRegimeInputs,
  type AttractorComparisonResult,
} from "./geometric-regime.js";
export type { GeometricSignature } from "./superformula.js";
export {
  featuresFromFrame,
  driftRate,
  type DriftFeatures,
  type DriftFeatureFrameInput,
} from "./governance/drift.js";
export {
  computeSpectralNegentropyIndex,
  spectralNegentropyDelta,
  type SpectralSequence,
  type SpectralNegentropyOptions,
  type SpectralNegentropyResult,
  type SpectralNegentropyChannel,
} from "./governance/coherence-density.js";
export {
  DEFAULT_MAX_GAMMA,
  DEFAULT_POINT_OF_NO_RETURN_RATIO,
  lorentzGamma,
  evaluateLorentzBarrier,
  type LorentzBarrierResult,
} from "./governance/lorentz.js";
export {
  analyzeLinchpin,
  type LinchpinMetric,
  type LinchpinDirection,
  type LinchpinObservation,
  type LinchpinScore,
  type LinchpinAnalysis,
  type LinchpinOptions,
} from "./governance/linchpin.js";
export {
  evaluateStructuralPersistence,
  type StructuralPersistenceObservation,
  type StructuralPersistenceOptions,
  type StructuralPersistenceResult,
  type StructuralPersistenceComponents,
} from "./governance/persistence.js";
export {
  REGIME_STATES,
  uniformPosterior,
  updateRegimePosterior,
  posteriorArgmax,
  posteriorEntropy,
  posteriorConfidence,
  type RegimePosterior,
  type RegimeObservation,
  type BayesFilterOptions,
} from "./regime/bayes-filter.js";
export {
  estimateCorrelationDimension,
  classifyDimensionBand,
  type DimensionBand,
  type CorrelationDimensionOptions,
  type CorrelationDimensionResult,
  type DimensionBandOptions,
} from "./dynamics/dimension.js";
export type {
  GeometryState,
  GeometryEvalGrad,
  JSpaceResolution,
  Vector3,
} from "./types.js";
