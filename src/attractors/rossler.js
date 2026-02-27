// @sigilnet/coherence/src/attractors/rossler.ts
export const ROSSLER_DEFAULT_PARAMS = {
    a: 0.2,
    b: 0.2,
    c: 5.7,
};
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
export function computeRossler({ params = ROSSLER_DEFAULT_PARAMS, initialPoint = { x: 0.1, y: 0, z: 0 }, steps = 50000, dt = 0.01, }) {
    const p = { ...ROSSLER_DEFAULT_PARAMS, ...params };
    const { a, b, c } = p;
    let x = initialPoint.x;
    let y = initialPoint.y;
    let z = initialPoint.z;
    const positions = new Float64Array(steps * 3);
    for (let i = 0; i < steps; i++) {
        // Rössler equations
        const dx = -y - z;
        const dy = x + a * y;
        const dz = b + z * (x - c);
        x += dx * dt;
        y += dy * dt;
        z += dz * dt;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }
    return positions;
}
/**
 * Rössler parameter presets for different behaviors
 */
export const ROSSLER_PRESETS = {
    classic: {
        name: "Classic spiral",
        params: { a: 0.2, b: 0.2, c: 5.7 },
        description: "Standard Rössler attractor",
    },
    periodic: {
        name: "Periodic orbit",
        params: { a: 0.2, b: 0.2, c: 3.0 },
        description: "Below chaos threshold",
    },
    chaotic: {
        name: "Deep chaos",
        params: { a: 0.2, b: 0.2, c: 9.0 },
        description: "Highly chaotic regime",
    },
    funnel: {
        name: "Funnel shape",
        params: { a: 0.1, b: 0.1, c: 14.0 },
        description: "Wider, funnel-like attractor",
    },
};
