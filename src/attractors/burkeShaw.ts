// Burke-Shaw attractor — 3D system with folded double-scroll topology
// Visual character: two interlinked scrolls, similar to Lorenz but more compact
// Great for BRUTUS faction — aggressive folded structure
//
// dx/dt = -s·(x + y)
// dy/dt = -y - s·x·z
// dz/dt = s·x·y + v
// Classic params: s = 10, v = 4.272

export interface BurkeShawParams {
  s: number;
  v: number;
}

export const BURKE_SHAW_DEFAULT_PARAMS: BurkeShawParams = { s: 10, v: 4.272 };

export interface BurkeShawPoint3D { x: number; y: number; z: number }

export function computeBurkeShaw({
  params,
  initialPoint,
  steps = 10000,
  dt = 0.004,
}: {
  params?: Partial<BurkeShawParams>;
  initialPoint?: BurkeShawPoint3D;
  steps?: number;
  dt?: number;
}): Float64Array {
  const { s, v } = { ...BURKE_SHAW_DEFAULT_PARAMS, ...params };
  let { x, y, z } = { x: 0.6, y: 0, z: 0, ...initialPoint };
  const out = new Float64Array(steps * 3);
  for (let i = 0; i < steps; i++) {
    const dx = -s * (x + y);
    const dy = -y - s * x * z;
    const dz = s * x * y + v;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    out[i * 3]     = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

export const BURKE_SHAW_PRESETS = {
  classic: { s: 10,    v: 4.272 },
  tight:   { s: 10,    v: 4.0   },
  open:    { s: 8.5,   v: 4.272 },
  chaotic: { s: 13.0,  v: 4.272 },
} satisfies Record<string, BurkeShawParams>;
