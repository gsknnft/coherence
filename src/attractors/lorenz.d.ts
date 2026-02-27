export declare const LORENZ_DEFAULT_PARAMS: {
    sigma: number;
    rho: number;
    beta: number;
};
export interface LorenzPoint3D {
    x: number;
    y: number;
    z: number;
}
/**
 * Lorenz Attractor - The classic "butterfly effect" chaotic system
 *
 * Equations:
 * dx/dt = σ(y - x)
 * dy/dt = x(ρ - z) - y
 * dz/dt = xy - βz
 *
 * Default params (σ=10, ρ=28, β=8/3) produce the iconic butterfly shape.
 *
 * Characteristics:
 * - Two "wings" (lobes)
 * - Never repeats exact trajectory
 * - Sensitive to initial conditions
 * - Deterministic chaos
 */
export declare function computeLorenz({ params, initialPoint, steps, dt, }: {
    params?: Partial<typeof LORENZ_DEFAULT_PARAMS>;
    initialPoint?: LorenzPoint3D;
    steps?: number;
    dt?: number;
}): Float64Array;
/**
 * Lorenz parameter presets for different behaviors
 */
export declare const LORENZ_PRESETS: {
    classic: {
        name: string;
        params: {
            sigma: number;
            rho: number;
            beta: number;
        };
        description: string;
    };
    periodic: {
        name: string;
        params: {
            sigma: number;
            rho: number;
            beta: number;
        };
        description: string;
    };
    chaotic: {
        name: string;
        params: {
            sigma: number;
            rho: number;
            beta: number;
        };
        description: string;
    };
    sparse: {
        name: string;
        params: {
            sigma: number;
            rho: number;
            beta: number;
        };
        description: string;
    };
};
