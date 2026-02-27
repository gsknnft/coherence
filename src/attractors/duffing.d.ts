export declare const DEFAULT_DUFFING_PARAMS: {
    alpha: number;
    beta: number;
    delta: number;
    gamma: number;
    omega: number;
};
export interface DuffingPoint3D {
    x: number;
    y: number;
    z: number;
}
/**
 * Duffing Attractor - Forced nonlinear oscillator
 *
 * Equations:
 * dx/dt = y
 * dy/dt = -δy - αx - βx³ + γcos(ωt)
 * dz/dt = ω  (phase, wraps at 2π)
 *
 * This is a driven damped oscillator with cubic nonlinearity.
 *
 * Default params produce chaotic attractor.
 *
 * Characteristics:
 * - Models physical oscillators (magnetic pendulum, buckled beam)
 * - Periodic forcing (γcos(ωt))
 * - Cubic restoring force (-βx³)
 * - Can exhibit period-doubling route to chaos
 */
export declare function computeDuffing({ params, initialPoint, steps, dt, }: {
    params?: Partial<typeof DEFAULT_DUFFING_PARAMS>;
    initialPoint?: DuffingPoint3D;
    steps?: number;
    dt?: number;
}): Float64Array;
/**
 * Duffing parameter presets
 */
export declare const DUFFING_PRESETS: {
    classic: {
        name: string;
        params: {
            alpha: number;
            beta: number;
            delta: number;
            gamma: number;
            omega: number;
        };
        description: string;
    };
    periodic: {
        name: string;
        params: {
            alpha: number;
            beta: number;
            delta: number;
            gamma: number;
            omega: number;
        };
        description: string;
    };
    period_doubling: {
        name: string;
        params: {
            alpha: number;
            beta: number;
            delta: number;
            gamma: number;
            omega: number;
        };
        description: string;
    };
    strong_chaos: {
        name: string;
        params: {
            alpha: number;
            beta: number;
            delta: number;
            gamma: number;
            omega: number;
        };
        description: string;
    };
};
