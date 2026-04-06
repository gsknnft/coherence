// @gsknnft/coherence/src/attractors/henon.ts

export const DEFAULT_HENON_PARAMS = {
  a: 1.4,
  b: 0.3,
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
export function computeHenon({
  params = DEFAULT_HENON_PARAMS,
  initialPoint = { x: 0, y: 0 },
  iterations = 50000,
}: {
  params?: Partial<typeof DEFAULT_HENON_PARAMS>;
  initialPoint?: HenonPoint2D;
  iterations?: number;
}): Float64Array {
  const p = { ...DEFAULT_HENON_PARAMS, ...params };
  const { a, b } = p;

  let x = initialPoint.x;
  let y = initialPoint.y;

  // Hénon is 2D, so we store as [x, y, 0] for consistency
  const positions = new Float64Array(iterations * 3);

  for (let i = 0; i < iterations; i++) {
    const xNext = 1 - a * x * x + y;
    const yNext = b * x;

    x = xNext;
    y = yNext;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = 0; // z=0 for 2D map
  }

  return positions;
}

/**
 * Hénon parameter presets
 */
export const HENON_PRESETS = {
  classic: {
    name: "Classic strange attractor",
    params: { a: 1.4, b: 0.3 },
    description: "The canonical Hénon attractor",
  },

  periodic: {
    name: "Period-7 orbit",
    params: { a: 1.29, b: 0.3 },
    description: "Stable periodic orbit",
  },

  chaotic: {
    name: "Deep chaos",
    params: { a: 1.42, b: 0.3 },
    description: "Highly chaotic regime",
  },

  dissipative: {
    name: "Less dissipative",
    params: { a: 1.4, b: 0.1 },
    description: "Reduced dissipation (smaller b)",
  },
};
