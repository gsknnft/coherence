export declare const AIZAWA_DEFAULT_PARAMS: {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
};
export interface AizawaPoint3D {
    x: number;
    y: number;
    z: number;
}
export declare function computeAizawa({ params, initialPoint, steps, dt, }: {
    params?: Partial<typeof AIZAWA_DEFAULT_PARAMS>;
    initialPoint?: AizawaPoint3D;
    steps?: number;
    dt?: number;
}): Float64Array;
