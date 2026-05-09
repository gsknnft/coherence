// Thomas attractor — dissipative system with trigonometric coupling
// Visual character: interconnected looping tubes, slow drift between lobes
// b → 0 gives complex braided structure; b → 0.21 is classic strange attractor
//
// dx/dt = sin(y) - b·x
// dy/dt = sin(z) - b·y
// dz/dt = sin(x) - b·z

export interface ThomasParams {
  b: number;
}

export const THOMAS_DEFAULT_PARAMS: ThomasParams = { b: 0.208186 };

export interface ThomasPoint3D { x: number; y: number; z: number }

export function computeThomas({
  params,
  initialPoint,
  steps = 10000,
  dt = 0.05,
}: {
  params?: Partial<ThomasParams>;
  initialPoint?: ThomasPoint3D;
  steps?: number;
  dt?: number;
}): Float64Array {
  const { b } = { ...THOMAS_DEFAULT_PARAMS, ...params };
  let { x, y, z } = { x: 0.1, y: 0, z: 0, ...initialPoint };
  const out = new Float64Array(steps * 3);
  for (let i = 0; i < steps; i++) {
    const dx = Math.sin(y) - b * x;
    const dy = Math.sin(z) - b * y;
    const dz = Math.sin(x) - b * z;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    out[i * 3]     = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

export const THOMAS_PRESETS = {
  classic:   { b: 0.208186 },
  labyrinth: { b: 0.000001 }, // near-Hamiltonian, space-filling labyrinth
  periodic:  { b: 0.32 },
  sparse:    { b: 0.18 },
} satisfies Record<string, ThomasParams>;
