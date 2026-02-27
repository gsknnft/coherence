// @sigilnet/coherence/src/attractors/index.ts
export * from "./projection.js";
export * from "./comparison.js";
export * from "./aizawa.js";
export * from "./lorenz.js";
export * from "./rossler.js";
export * from "./henon.js";
export * from "./duffing.js";
import { computeAizawa } from "./aizawa.js";
import { computeDuffing } from "./duffing.js";
import { computeHenon } from "./henon.js";
import { computeLorenz } from "./lorenz.js";
import { computeRossler } from "./rossler.js";
export { computeHenon, DEFAULT_HENON_PARAMS, HENON_PRESETS } from "./henon.js";
export { computeDuffing, DEFAULT_DUFFING_PARAMS, DUFFING_PRESETS } from "./duffing.js";
export { computeAizawa, AIZAWA_DEFAULT_PARAMS as AIZAWA_PARAMS, } from "./aizawa.js";
export { computeLorenz, LORENZ_DEFAULT_PARAMS as LORENZ_PARAMS, LORENZ_PRESETS, } from "./lorenz.js";
export { computeRossler, ROSSLER_DEFAULT_PARAMS as ROSSLER_PARAMS, ROSSLER_PRESETS } from './rossler.js';
export { projectToPolar } from './projection.js';
export const ALL_ATTRACTORS = [
    "aizawa",
    "lorenz",
    "rossler",
    "henon",
    "duffing",
];
export const ATTRACTOR_METADATA = {
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
export function computeAttractor(config) {
    switch (config.type) {
        case "aizawa":
            return computeAizawa(config);
        case "lorenz":
            return computeLorenz(config);
        case "rossler":
            return computeRossler(config);
        case "henon":
            return computeHenon({ ...config, iterations: config.steps });
        case "duffing":
            return computeDuffing(config);
        default:
            throw new Error(`Unknown attractor: ${config.type}`);
    }
}
