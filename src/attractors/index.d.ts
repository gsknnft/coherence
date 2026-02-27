export * from "./projection.js";
export * from "./comparison.js";
export * from "./aizawa.js";
export * from "./lorenz.js";
export * from "./rossler.js";
export * from "./henon.js";
export * from "./duffing.js";
export { computeHenon, DEFAULT_HENON_PARAMS, HENON_PRESETS } from "./henon.js";
export { computeDuffing, DEFAULT_DUFFING_PARAMS, DUFFING_PRESETS } from "./duffing.js";
export { computeAizawa, AIZAWA_DEFAULT_PARAMS as AIZAWA_PARAMS, } from "./aizawa.js";
export { computeLorenz, LORENZ_DEFAULT_PARAMS as LORENZ_PARAMS, LORENZ_PRESETS, } from "./lorenz.js";
export { computeRossler, ROSSLER_DEFAULT_PARAMS as ROSSLER_PARAMS, ROSSLER_PRESETS } from './rossler.js';
export { projectToPolar } from './projection.js';
export type AttractorType = "aizawa" | "lorenz" | "rossler" | "henon" | "duffing";
export declare const ALL_ATTRACTORS: AttractorType[];
export interface AttractorConfig {
    type: AttractorType;
    params?: Record<string, number>;
    initialPoint?: {
        x: number;
        y: number;
        z: number;
    };
    steps?: number;
    dt?: number;
}
export interface AttractorMetadata {
    name: string;
    dimension: "2D" | "3D";
    type: "continuous" | "discrete";
    description: string;
}
export declare const ATTRACTOR_METADATA: Record<AttractorType, AttractorMetadata>;
/**
 * Unified attractor generation interface
 */
export declare function computeAttractor(config: {
    type: AttractorType;
    params?: Record<string, number>;
    initialPoint?: {
        x: number;
        y: number;
        z: number;
    };
    steps?: number;
    iterations?: number;
    dt?: number;
}): Float64Array;
