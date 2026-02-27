export declare const DEFAULT_HENON_PARAMS: {
    a: number;
    b: number;
};
export interface HenonPoint2D {
    x: number;
    y: number;
}
/**
 * Hénon Attractor - 2D discrete chaotic map
 *
 * Equations (discrete map, not ODE):
 * x_{n+1} = 1 - a*x_n^2 + y_n
 * y_{n+1} = b*x_n
 *
 * Default params (a=1.4, b=0.3) produce strange attractor.
 *
 * Characteristics:
 * - 2D map (unlike 3D continuous attractors)
 * - Discrete iterations (not differential equations)
 * - Famous for fractal boundary structure
 * - Computationally very fast
 * - Often used in chaos theory education
 */
export declare function computeHenon({ params, initialPoint, iterations, }: {
    params?: Partial<typeof DEFAULT_HENON_PARAMS>;
    initialPoint?: HenonPoint2D;
    iterations?: number;
}): Float64Array;
/**
 * Hénon parameter presets
 */
export declare const HENON_PRESETS: {
    classic: {
        name: string;
        params: {
            a: number;
            b: number;
        };
        description: string;
    };
    periodic: {
        name: string;
        params: {
            a: number;
            b: number;
        };
        description: string;
    };
    chaotic: {
        name: string;
        params: {
            a: number;
            b: number;
        };
        description: string;
    };
    dissipative: {
        name: string;
        params: {
            a: number;
            b: number;
        };
        description: string;
    };
};
