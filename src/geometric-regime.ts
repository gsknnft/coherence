import type { GeometricSignature } from "./superformula.js";
import type { compareToAttractors } from "./attractors/comparison.js";
import type { JSpaceResolution } from "./types.js";

export type MorphologyRegimeLabel =
  | "coherent"
  | "turbulent"
  | "chaotic"
  | "predatory";

export interface MorphologyGeometricRegime {
  regime: MorphologyRegimeLabel;
  confidence: number;
  reasoning: string;
}

export type AttractorComparisonResult = ReturnType<typeof compareToAttractors>;

export type GeometricRegimeLabel =
  | "stable-gradient"
  | "stable-orbit"
  | "chaotic"
  | "turbulent"
  | "unstable"
  | "model-mismatch";

export interface GeometricRegimeInputs {
  jResolution?: JSpaceResolution;
  attractorComparison?: AttractorComparisonResult;
  morphology?: GeometricSignature;
}

export interface GeometricRegime {
  regime: GeometricRegimeLabel;
  confidence: number;
  diagnostics: string[];
}

export function buildGeometricRegimeInputs({
  jResolution,
  attractorComparison,
  morphology,
}: GeometricRegimeInputs): GeometricRegimeInputs {
  return { jResolution, attractorComparison, morphology };
}

type FlowAlignmentMode =
  | "descent"
  | "orthogonal"
  | "uphill"
  | "mixed"
  | "unavailable";

/**
 * Morphology-only classifier (legacy behavior, retained for compatibility).
 */
export function classifyGeometricRegime(
  signature: GeometricSignature,
): MorphologyGeometricRegime {
  let { symmetry, roughness, fitError } = signature;
  if (fitError === undefined) {
    fitError = 0.5; // Penalize unstable fits
  }
  const coherence = symmetry * (1 - roughness);
  const entropy = fitError + roughness;
  const negentropy = coherence / Math.max(0.01, entropy);

  if (negentropy > 3.0 && symmetry > 0.7 && fitError < 0.15) {
    return {
      regime: "coherent",
      confidence: 0.9,
      reasoning: "High symmetry, low roughness, excellent fit",
    };
  }

  if (negentropy > 1.5 && fitError < 0.35) {
    return {
      regime: "turbulent",
      confidence: 0.7,
      reasoning: "Moderate symmetry, some roughness, decent fit",
    };
  }

  if (fitError < 0.5) {
    return {
      regime: "chaotic",
      confidence: 0.6,
      reasoning: "Low coherence, complex geometry, marginal fit",
    };
  }

  return {
    regime: "predatory",
    confidence: 0.8,
    reasoning: "No coherent geometric structure, adversarial pattern",
  };
}

/**
 * Pure fusion logic for geometric regime interpretation.
 * Combines already-computed invariants without resampling or model fitting.
 */
export function evaluateGeometricRegime(
  inputs: GeometricRegimeInputs,
): GeometricRegime {
  const diagnostics: string[] = [];

  const j = inputs.jResolution;
  const a = inputs.attractorComparison;
  const morphologyAssessment = inputs.morphology
    ? classifyGeometricRegime(inputs.morphology)
    : null;

  const flowMode = normalizeFlowMode(a?.diagnostics.flowAlignmentMode);
  const flow = a?.diagnostics.flowAlignment ?? null;
  const flowAbs = a?.diagnostics.flowAlignmentAbs ?? null;
  const flowSamples = a?.diagnostics.flowAlignmentSamples ?? 0;

  const jResolved = j?.resolved === true;
  const basinHoldMet = j?.basinHoldMet === true;
  const lambdaMin = j?.lambdaMin;
  const violationRate = j?.deltaJViolationRate;
  const lambdaMinPositive = typeof lambdaMin === "number" && lambdaMin > 0;
  const highViolationRate =
    typeof violationRate === "number" && violationRate > 0.1;

  const attractorRegime = a?.regime;
  const attractorSimilarity = a?.similarity ?? 0;
  const chaoticSimilarity = attractorRegime === "chaotic" && attractorSimilarity >= 0.65;
  const coherentShapeGate = a?.diagnostics.coherentGate === true;

  if (j) {
    diagnostics.push(jResolved ? "jspace:resolved" : "jspace:unresolved");
    if (basinHoldMet) diagnostics.push("jspace:basin_hold");
    if (lambdaMinPositive) diagnostics.push("jspace:lambda_min_positive");
    if (highViolationRate) diagnostics.push("jspace:high_deltaJ_violation_rate");
  } else {
    diagnostics.push("jspace:unavailable");
  }

  if (a) {
    diagnostics.push(`attractor:regime:${a.regime}`);
    diagnostics.push(`attractor:similarity:${round3(attractorSimilarity)}`);
    if (a.bestMatch) diagnostics.push(`attractor:best_match:${a.bestMatch}`);
  } else {
    diagnostics.push("attractor:unavailable");
  }

  diagnostics.push(`flow:mode:${flowMode}`);
  if (flow !== null) diagnostics.push(`flow:mean_cos:${round3(flow)}`);
  if (flowAbs !== null) diagnostics.push(`flow:mean_abs_cos:${round3(flowAbs)}`);
  if (flowSamples > 0) diagnostics.push(`flow:samples:${flowSamples}`);

  if (morphologyAssessment) {
    diagnostics.push(`morphology:regime:${morphologyAssessment.regime}`);
    diagnostics.push(
      `morphology:confidence:${round3(morphologyAssessment.confidence)}`,
    );
  } else {
    diagnostics.push("morphology:unavailable");
  }

  let regime: GeometricRegimeLabel = "turbulent";

  if (flowMode === "uphill") {
    diagnostics.push("fusion:flow_uphill");
    if (jResolved || (lambdaMinPositive && coherentShapeGate)) {
      regime = "model-mismatch";
      diagnostics.push("fusion:j_flow_contradiction");
    } else {
      regime = "unstable";
      diagnostics.push("fusion:instability_inferred");
    }
  } else if (flowMode === "descent" && jResolved) {
    if (chaoticSimilarity) {
      regime = "turbulent";
      diagnostics.push("fusion:descent_but_chaotic_shape");
    } else {
      regime = "stable-gradient";
      diagnostics.push("fusion:gradient_descent_alignment");
    }
  } else if (flowMode === "orthogonal") {
    if (chaoticSimilarity) {
      regime = "chaotic";
      diagnostics.push("fusion:non_gradient_chaotic_orbit");
    } else if (jResolved || basinHoldMet) {
      regime = "stable-orbit";
      diagnostics.push("fusion:non_gradient_stable_orbit");
    } else {
      regime = "turbulent";
      diagnostics.push("fusion:orbit_like_without_local_cert");
    }
  } else if (flowMode === "mixed") {
    if (chaoticSimilarity) {
      regime = "chaotic";
      diagnostics.push("fusion:mixed_flow_chaotic_similarity");
    } else if (highViolationRate) {
      regime = "unstable";
      diagnostics.push("fusion:mixed_flow_high_violations");
    } else {
      regime = "turbulent";
      diagnostics.push("fusion:mixed_flow_transition");
    }
  } else {
    // No flow alignment available: stay conservative and fuse the remaining signals.
    if (chaoticSimilarity) {
      regime = "chaotic";
      diagnostics.push("fusion:chaotic_similarity_without_flow");
    } else if (jResolved && morphologyAssessment?.regime === "coherent") {
      regime = "stable-gradient";
      diagnostics.push("fusion:jspace_morphology_consensus_no_flow");
    } else if (!jResolved && highViolationRate) {
      regime = "unstable";
      diagnostics.push("fusion:unresolved_jspace_high_violations_no_flow");
    } else {
      regime = "turbulent";
      diagnostics.push("fusion:insufficient_flow_evidence");
    }
  }

  if (
    flow !== null &&
    flowAbs !== null &&
    Math.abs(flow) < 0.1 &&
    flowAbs > 0.5
  ) {
    diagnostics.push("flow:zero_mean_high_abs_possible_bimodal");
  }

  const confidence = scoreFusionConfidence({
    inputs,
    regime,
    flowMode,
    flow,
    flowAbs,
    jResolved,
    chaoticSimilarity,
  });

  return { regime, confidence, diagnostics };
}

export const classifyGeometricRegimeEngine = evaluateGeometricRegime;

function normalizeFlowMode(mode: unknown): FlowAlignmentMode {
  if (
    mode === "descent" ||
    mode === "orthogonal" ||
    mode === "uphill" ||
    mode === "mixed" ||
    mode === "unavailable"
  ) {
    return mode;
  }
  return "unavailable";
}

function scoreFusionConfidence(args: {
  inputs: GeometricRegimeInputs;
  regime: GeometricRegimeLabel;
  flowMode: FlowAlignmentMode;
  flow: number | null;
  flowAbs: number | null;
  jResolved: boolean;
  chaoticSimilarity: boolean;
}): number {
  const { inputs, regime, flowMode, flow, flowAbs, jResolved, chaoticSimilarity } =
    args;

  let score = 0.35;
  if (inputs.jResolution) score += 0.15;
  if (inputs.attractorComparison) score += 0.15;
  if (inputs.morphology) score += 0.1;
  if (flowMode !== "unavailable") score += 0.1;

  switch (regime) {
    case "stable-gradient":
      if (jResolved) score += 0.1;
      if (flowMode === "descent") score += 0.15;
      break;
    case "stable-orbit":
      if (flowMode === "orthogonal") score += 0.15;
      if (jResolved) score += 0.05;
      break;
    case "chaotic":
      if (chaoticSimilarity) score += 0.15;
      if (flowMode === "orthogonal" || flowMode === "mixed") score += 0.05;
      break;
    case "unstable":
      if (flowMode === "uphill") score += 0.15;
      break;
    case "model-mismatch":
      if (flowMode === "uphill") score += 0.1;
      if (jResolved) score += 0.1;
      break;
    case "turbulent":
      score += 0.02;
      break;
  }

  if (flow !== null && flowAbs !== null && Math.abs(flow) < 0.1 && flowAbs > 0.5) {
    score -= 0.1;
  }

  return clamp(score, 0.05, 0.98);
}

function round3(value: number): string {
  return value.toFixed(3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
