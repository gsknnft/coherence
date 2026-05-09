// @gsknnft/coherence/src/attractors/index.ts
export * from "./aizawa.js";
export * from "./burkeShaw.js";
export { computeBurkeShaw, BURKE_SHAW_DEFAULT_PARAMS, BURKE_SHAW_PRESETS } from "./burkeShaw.js";
export * from "./halvorsen.js";
export { computeHalvorsen, HALVORSEN_DEFAULT_PARAMS, HALVORSEN_PRESETS } from "./halvorsen.js";
export * from "./sprott.js";
export { computeSprott } from "./sprott.js";
export * from "./thomas.js";
export { computeThomas, THOMAS_DEFAULT_PARAMS, THOMAS_PRESETS } from "./thomas.js";
export {
  AIZAWA_DEFAULT_PARAMS as AIZAWA_PARAMS,
  computeAizawa,
} from "./aizawa.js";
export * from "./comparison.js";
export * from "./duffing.js";
export {
  computeDuffing,
  DEFAULT_DUFFING_PARAMS,
  DUFFING_PRESETS,
} from "./duffing.js";
export * from "./henon.js";
export { computeHenon, DEFAULT_HENON_PARAMS, HENON_PRESETS } from "./henon.js";
export * from "./lorenz.js";
export {
  computeLorenz,
  LORENZ_DEFAULT_PARAMS as LORENZ_PARAMS,
  LORENZ_PRESETS,
} from "./lorenz.js";
export * from "./projection.js";
export { projectToPolar } from "./projection.js";
export * from "./rossler.js";
export {
  computeRossler,
  ROSSLER_DEFAULT_PARAMS as ROSSLER_PARAMS,
  ROSSLER_PRESETS,
} from "./rossler.js";

import { computeAizawa } from "./aizawa.js";
import { computeBurkeShaw } from "./burkeShaw.js";
import { computeDuffing } from "./duffing.js";
import { computeHalvorsen } from "./halvorsen.js";
import { computeHenon } from "./henon.js";
import { computeLorenz } from "./lorenz.js";
import { computeRossler } from "./rossler.js";
import { computeSprott, type SprottVariant } from "./sprott.js";
import { computeThomas } from "./thomas.js";

export type AttractorType =
  | "aizawa"
  | "burke-shaw"
  | "duffing"
  | "halvorsen"
  | "henon"
  | "lorenz"
  | "rossler"
  | "sprott"
  | "thomas";

export const ALL_ATTRACTORS: AttractorType[] = [
  "aizawa", "burke-shaw", "duffing", "halvorsen", "henon", "lorenz", "rossler", "sprott", "thomas",
];

export interface AttractorConfig {
  type: AttractorType;
  params?: Record<string, number>;
  initialPoint?: { x: number; y: number; z: number };
  steps?: number;
  dt?: number;
}

export interface AttractorMetadata {
  name: string;
  dimension: "2D" | "3D";
  type: "continuous" | "discrete";
  description: string;
}

export const ATTRACTOR_METADATA: Record<AttractorType, AttractorMetadata> = {
  "burke-shaw": {
    name: "Burke-Shaw",
    dimension: "3D",
    type: "continuous",
    description: "Folded double-scroll — compact aggressive topology",
  },
  halvorsen: {
    name: "Halvorsen",
    dimension: "3D",
    type: "continuous",
    description: "Cyclic pinwheel spiral — smooth multi-lobed structure",
  },
  sprott: {
    name: "Sprott",
    dimension: "3D",
    type: "continuous",
    description: "Minimal one-nonlinearity family (variants A–L)",
  },
  thomas: {
    name: "Thomas",
    dimension: "3D",
    type: "continuous",
    description: "Dissipative trigonometric coupling — labyrinthine at low b",
  },
  aizawa: {
    name: "Aizawa",
    dimension: "3D",
    type: "continuous",
    description: "Complex multi-modal chaotic attractor",
  },
  lorenz: {
    name: "Lorenz",
    dimension: "3D",
    type: "continuous",
    description: "Classic butterfly-shaped attractor (1963)",
  },
  rossler: {
    name: "Rössler",
    dimension: "3D",
    type: "continuous",
    description: "Single-banded spiral attractor (1976)",
  },
  henon: {
    name: "Hénon",
    dimension: "2D",
    type: "discrete",
    description: "Discrete map with fractal structure (1976)",
  },
  duffing: {
    name: "Duffing",
    dimension: "3D",
    type: "continuous",
    description: "Forced nonlinear oscillator (physical model)",
  },
};

/**
 * Unified attractor generation interface
 */
export function computeAttractor(config: {
  type: AttractorType;
  params?: Record<string, number>;
  initialPoint?: { x: number; y: number; z: number };
  steps?: number;
  iterations?: number;
  dt?: number;
  /** For Sprott family: which variant A-L to use */
  sprottVariant?: SprottVariant;
}): Float64Array {
  switch (config.type) {
    case "aizawa":      return computeAizawa(config);
    case "burke-shaw":  return computeBurkeShaw(config);
    case "duffing":     return computeDuffing(config);
    case "halvorsen":   return computeHalvorsen(config);
    case "henon":       return computeHenon({ ...config, iterations: config.steps });
    case "lorenz":      return computeLorenz(config);
    case "rossler":     return computeRossler(config);
    case "sprott":      return computeSprott({ variant: config.sprottVariant ?? "B", ...config });
    case "thomas":      return computeThomas(config);
    default:            throw new Error(`Unknown attractor: ${config.type}`);
  }
}
