// @sigilnet/coherence/src/attractors/aizawa.ts
// @sigilnet/coherence/src/attractors/aizawa.ts
export const AIZAWA_DEFAULT_PARAMS = {
    a: 0.95,
    b: 0.7,
    c: 0.6,
    d: 3.5,
    e: 0.25,
    f: 0.1,
};
export function computeAizawa({ params = AIZAWA_DEFAULT_PARAMS, initialPoint = { x: 0.1, y: 0, z: 0 }, steps = 50000, dt = 0.01, }) {
    const p = { ...AIZAWA_DEFAULT_PARAMS, ...params };
    const { a, b, c, d, e, f } = p;
    let x = initialPoint.x;
    let y = initialPoint.y;
    let z = initialPoint.z;
    const positions = new Float64Array(steps * 3);
    for (let i = 0; i < steps; i++) {
        // Standard Aizawa attractor ODEs
        const dx = (z - b) * x - d * y;
        const dy = d * x + (z - b) * y;
        const dz = c + a * z - z ** 3 / 3 - (x ** 2 + y ** 2) * (1 + e * z) + f * z * x ** 3;
        x += dx * dt;
        y += dy * dt;
        z += dz * dt;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }
    return positions;
}
