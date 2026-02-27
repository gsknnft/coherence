export declare const ROSSLER_DEFAULT_PARAMS: {
    a: number;
    b: number;
    c: number;
};
export interface RosslerPoint3D {
    x: number;
    y: number;
    z: number;
}
/**
 * Rössler Attractor - Simpler than Lorenz, still chaotic
 *
 * Equations:
 * dx/dt = -y - z
 * dy/dt = x + ay
 * dz/dt = b + z(x - c)
 *
 * Default params (a=0.2, b=0.2, c=5.7) produce a single-banded attractor.
 *
 * Characteristics:
 * - Single spiral band (vs Lorenz's two lobes)
 * - Simpler equations than Lorenz
 * - Still exhibits chaos for c > ~4
 * - Easier to analyze mathematically
 */
export declare function computeRossler({ params, initialPoint, steps, dt, }: {
    params?: Partial<typeof ROSSLER_DEFAULT_PARAMS>;
    initialPoint?: RosslerPoint3D;
    steps?: number;
    dt?: number;
}): Float64Array;
/**
 * Rössler parameter presets for different behaviors
 */
export declare const ROSSLER_PRESETS: {
    classic: {
        name: string;
        params: {
            a: number;
            b: number;
            c: number;
        };
        description: string;
    };
    periodic: {
        name: string;
        params: {
            a: number;
            b: number;
            c: number;
        };
        description: string;
    };
    chaotic: {
        name: string;
        params: {
            a: number;
            b: number;
            c: number;
        };
        description: string;
    };
    funnel: {
        name: string;
        params: {
            a: number;
            b: number;
            c: number;
        };
        description: string;
    };
};
