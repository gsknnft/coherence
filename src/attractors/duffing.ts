// @gsknnft/coherence/src/attractors/duffing.ts

export const DEFAULT_DUFFING_PARAMS = {
  alpha: -1,
  beta: 1,
  delta: 0.2,
  gamma: 0.3,
  omega: 1.2,
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
export function computeDuffing({
  params = DEFAULT_DUFFING_PARAMS,
  initialPoint = { x: 1, y: 0, z: 0 },
  steps = 50000,
  dt = 0.01,
}: {
  params?: Partial<typeof DEFAULT_DUFFING_PARAMS>;
  initialPoint?: DuffingPoint3D;
  steps?: number;
  dt?: number;
}): Float64Array {
  const p = { ...DEFAULT_DUFFING_PARAMS, ...params };
  const { alpha, beta, delta, gamma, omega } = p;

  let x = initialPoint.x;
  let y = initialPoint.y;
  let t = initialPoint.z; // time/phase

  const positions = new Float64Array(steps * 3);

  for (let i = 0; i < steps; i++) {
    // Duffing equations
    const dx = y;
    const dy =
      -delta * y - alpha * x - beta * x ** 3 + gamma * Math.cos(omega * t);
    const dt_phase = omega;

    x += dx * dt;
    y += dy * dt;
    t += dt_phase * dt;

    // Wrap phase to [0, 2π]
    if (t > 2 * Math.PI) t -= 2 * Math.PI;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = t; // Store phase as z
  }

  return positions;
}

/**
 * Duffing parameter presets
 */
export const DUFFING_PRESETS = {
  classic: {
    name: "Classic chaotic",
    params: { alpha: -1, beta: 1, delta: 0.2, gamma: 0.3, omega: 1.2 },
    description: "Standard chaotic Duffing oscillator",
  },

  periodic: {
    name: "Period-1 orbit",
    params: { alpha: -1, beta: 1, delta: 0.2, gamma: 0.29, omega: 1.2 },
    description: "Just below chaos threshold",
  },

  period_doubling: {
    name: "Period-2",
    params: { alpha: -1, beta: 1, delta: 0.2, gamma: 0.35, omega: 1.2 },
    description: "Period-doubling regime",
  },

  strong_chaos: {
    name: "Strong chaos",
    params: { alpha: -1, beta: 1, delta: 0.2, gamma: 0.5, omega: 1.2 },
    description: "Deep chaotic regime",
  },
};
