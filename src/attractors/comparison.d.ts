import { type AttractorType } from "./index.js";
import { type GeometricSignature } from "../superformula.js";
import type { GeometryEvalGrad } from "../types.js";
type ProjectionPlane = "xy" | "xz" | "yz";
type FlowAlignmentMode = "descent" | "orthogonal" | "uphill" | "mixed" | "unavailable";
export interface CompareToAttractorsOptions {
    /**
     * Optional J-space gradient callback. When provided, diagnostics include
     * average cos(theta) between grad J(s) and local trajectory velocity.
     */
    gradient?: GeometryEvalGrad["gradient"];
    /**
     * Point stride used for finite-difference flow alignment. Default: 1.
     */
    flowSampleStride?: number;
    /**
     * Minimum norm for both grad and velocity vectors before a sample is used.
     */
    flowMinNorm?: number;
}
/**
 * Pre-computed reference signatures for known attractors
 */
export declare const REFERENCE_SIGNATURES: Record<AttractorType, GeometricSignature>;
/**
 * Compare system behavior to known strange attractors
 */
export declare function compareToAttractors(systemBehavior: Float64Array, projection?: ProjectionPlane, options?: CompareToAttractorsOptions): {
    bestMatch: AttractorType | null;
    similarity: number;
    regime: "coherent" | "turbulent" | "chaotic" | "predatory";
    scores: Record<AttractorType, number>;
    diagnostics: {
        projection: ProjectionPlane;
        fitError: number;
        symmetry: number;
        roughness: number;
        anisotropy: number;
        coherentGate: boolean;
        matchScore: number;
        flowAlignment: number | null;
        flowAlignmentAbs: number | null;
        flowAlignmentSamples: number;
        flowAlignmentMode: FlowAlignmentMode;
    };
};
export {};
