// @gsknnft/coherence/src/attractors/lorenz.ts

export const LORENZ_DEFAULT_PARAMS = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
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
export function computeLorenz({
  params = LORENZ_DEFAULT_PARAMS,
  initialPoint = { x: 0.1, y: 0, z: 0 },
  steps = 50000,
  dt = 0.01,
}: {
  params?: Partial<typeof LORENZ_DEFAULT_PARAMS>;
  initialPoint?: LorenzPoint3D;
  steps?: number;
  dt?: number;
}): Float64Array {
  const p = { ...LORENZ_DEFAULT_PARAMS, ...params };
  const { sigma, rho, beta } = p;

  let x = initialPoint.x;
  let y = initialPoint.y;
  let z = initialPoint.z;

  const positions = new Float64Array(steps * 3);

  for (let i = 0; i < steps; i++) {
    // Lorenz equations
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;

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
 * Lorenz parameter presets for different behaviors
 */
export const LORENZ_PRESETS = {
  classic: {
    name: "Classic butterfly",
    params: { sigma: 10, rho: 28, beta: 8 / 3 },
    description: "The iconic Lorenz attractor shape",
  },

  periodic: {
    name: "Periodic orbit",
    params: { sigma: 10, rho: 24.5, beta: 8 / 3 },
    description: "Below chaos threshold, stable orbit",
  },

  chaotic: {
    name: "Deep chaos",
    params: { sigma: 10, rho: 99.96, beta: 8 / 3 },
    description: "Highly chaotic, complex attractor",
  },

  sparse: {
    name: "Sparse wings",
    params: { sigma: 14, rho: 30, beta: 3 },
    description: "Wider separation between lobes",
  },
};
