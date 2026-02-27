import type { PolarPoint } from "../superformula";
/**
 * Project 3D Aizawa attractor onto 2D plane and convert to polar
 */
export declare function projectToPolar(positions: Float64Array, projection?: "xy" | "xz" | "yz"): PolarPoint[];
