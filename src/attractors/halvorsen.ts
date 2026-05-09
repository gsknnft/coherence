// Halvorsen attractor — cyclic 3D system, generates a "pinwheel" structure
// Visual character: smooth multi-lobed spiral, great for NEXA energy fields
//
// dx/dt = -a·x - 4·y - 4·z - y²
// dy/dt = -a·y - 4·z - 4·x - z²
// dz/dt = -a·z - 4·x - 4·y - x²
// Classic params: a = 1.89

export interface HalvorsenParams {
  a: number;
}

export const HALVORSEN_DEFAULT_PARAMS: HalvorsenParams = { a: 1.89 };

export interface HalvorsenPoint3D { x: number; y: number; z: number }

export function computeHalvorsen({
  params,
  initialPoint,
  steps = 10000,
  dt = 0.01,
}: {
  params?: Partial<HalvorsenParams>;
  initialPoint?: HalvorsenPoint3D;
  steps?: number;
  dt?: number;
}): Float64Array {
  const { a } = { ...HALVORSEN_DEFAULT_PARAMS, ...params };
  let { x, y, z } = { x: -5, y: 0, z: 0, ...initialPoint };
  const out = new Float64Array(steps * 3);
  for (let i = 0; i < steps; i++) {
    const dx = -a * x - 4 * y - 4 * z - y * y;
    const dy = -a * y - 4 * z - 4 * x - z * z;
    const dz = -a * z - 4 * x - 4 * y - x * x;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    out[i * 3]     = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

export const HALVORSEN_PRESETS = {
  classic:  { a: 1.89 },
  tight:    { a: 2.40 },
  open:     { a: 1.40 },
  chaotic:  { a: 1.27 },
} satisfies Record<string, HalvorsenParams>;
