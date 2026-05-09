// Gray-Scott Reaction-Diffusion System
//
// Two chemical species U and V diffuse and react:
//   ∂U/∂t = Du·∇²U  -  U·V²  +  F·(1 - U)
//   ∂V/∂t = Dv·∇²V  +  U·V²  -  (F + k)·V
//
// Different (F, k) parameter pairs produce radically different patterns:
//   Spots      — coral, leopard, planet craters
//   Stripes    — zebra, terrain ridges
//   Holes      — swiss cheese, alien biomes
//   Labyrinths — brain coral, cave networks
//   Worms      — tube worms, fungal mycelium
//   Mitosis    — dividing cells, crystal growth
//
// Usage for game assets:
//   - Planet surface texture masks (albedo variation per biome type)
//   - Ship hull weathering pattern (corrosion, oxidation, carbon scoring)
//   - Protocol Wars unit markings (faction camo pattern)
//   - Terrain splotch/stain patterns for vera-world environments

export interface GrayScottParams {
  /** Feed rate — how fast U is replenished */
  F: number;
  /** Kill rate — how fast V is removed */
  k: number;
  /** Diffusion rate of U (faster species) */
  Du?: number;
  /** Diffusion rate of V (slower species) */
  Dv?: number;
}

export const GRAY_SCOTT_PRESETS: Record<string, GrayScottParams> = {
  spots:      { F: 0.035, k: 0.065, Du: 0.16, Dv: 0.08 }, // Leopard / coral spots
  stripes:    { F: 0.060, k: 0.062, Du: 0.16, Dv: 0.08 }, // Zebra stripes
  labyrinth:  { F: 0.040, k: 0.060, Du: 0.16, Dv: 0.08 }, // Brain coral maze
  holes:      { F: 0.039, k: 0.058, Du: 0.16, Dv: 0.08 }, // Inverse spots (holes in U)
  mitosis:    { F: 0.028, k: 0.062, Du: 0.16, Dv: 0.08 }, // Dividing cell spots
  worms:      { F: 0.058, k: 0.065, Du: 0.16, Dv: 0.08 }, // Tangled worm pattern
  coral:      { F: 0.025, k: 0.060, Du: 0.16, Dv: 0.08 }, // Coral/dendritic growth
  spirals:    { F: 0.020, k: 0.050, Du: 0.16, Dv: 0.08 }, // Rotating spirals
  // Faction-tuned presets:
  nexa:       { F: 0.037, k: 0.060, Du: 0.20, Dv: 0.10 }, // Crystalline lattice
  sigi:       { F: 0.030, k: 0.057, Du: 0.16, Dv: 0.08 }, // Ordered hexagonal
  brutus:     { F: 0.055, k: 0.063, Du: 0.14, Dv: 0.06 }, // Aggressive blotched
  frontier:   { F: 0.045, k: 0.068, Du: 0.16, Dv: 0.08 }, // Sparse scattered
};

export interface GrayScottResult {
  /** U concentration field, row-major [row * width + col] */
  U: Float32Array;
  /** V concentration field, row-major [row * width + col] */
  V: Float32Array;
  width: number;
  height: number;
  /** Number of steps actually computed */
  steps: number;
}

/**
 * Run the Gray-Scott reaction-diffusion simulation.
 * Returns U and V concentration fields normalized to [0, 1].
 *
 * Typical usage: use V field as a texture/mask for pattern generation.
 */
export function computeGrayScott({
  width = 256,
  height = 256,
  steps = 5000,
  params,
  seed = 42,
}: {
  width?: number;
  height?: number;
  steps?: number;
  params: GrayScottParams;
  /** Random seed for initial perturbation spot */
  seed?: number;
}): GrayScottResult {
  const { F, k, Du = 0.16, Dv = 0.08 } = params;
  const size = width * height;

  // Initialize: U=1 everywhere, V=0 everywhere, then seed a small spot
  const U = new Float32Array(size).fill(1);
  const V = new Float32Array(size);

  // Seed: place small V blobs using seeded PRNG
  let rng = seed >>> 0;
  const rand = () => {
    rng = (rng + 0x6d2b79f5) >>> 0;
    let t = Math.imul(rng ^ (rng >>> 15), 1 | rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const blobCount = 3 + Math.floor(rand() * 5);
  for (let b = 0; b < blobCount; b++) {
    const cx = Math.floor(rand() * width);
    const cy = Math.floor(rand() * height);
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        const nx = (cx + dx + width)  % width;
        const ny = (cy + dy + height) % height;
        if (dx * dx + dy * dy <= 36) {
          U[ny * width + nx] = 0.50 + (rand() - 0.5) * 0.1;
          V[ny * width + nx] = 0.25 + (rand() - 0.5) * 0.1;
        }
      }
    }
  }

  const nextU = new Float32Array(size);
  const nextV = new Float32Array(size);

  for (let step = 0; step < steps; step++) {
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const i = row * width + col;
        const l = row * width + ((col - 1 + width) % width);
        const r = row * width + ((col + 1) % width);
        const u = ((row - 1 + height) % height) * width + col;
        const d = ((row + 1) % height) * width + col;

        // Discrete Laplacian (5-point stencil)
        const lapU = U[l] + U[r] + U[u] + U[d] - 4 * U[i];
        const lapV = V[l] + V[r] + V[u] + V[d] - 4 * V[i];

        const uvv = U[i] * V[i] * V[i];
        nextU[i] = Math.max(0, Math.min(1, U[i] + Du * lapU - uvv + F * (1 - U[i])));
        nextV[i] = Math.max(0, Math.min(1, V[i] + Dv * lapV + uvv - (F + k) * V[i]));
      }
    }
    U.set(nextU);
    V.set(nextV);
  }

  return { U, V, width, height, steps };
}

/**
 * Convert Gray-Scott V field to an RGBA Uint8ClampedArray (image data).
 * V → grayscale alpha mask usable as a texture.
 */
export function grayScottToImageData(
  result: GrayScottResult,
  colorLow: [number, number, number] = [0, 0, 0],
  colorHigh: [number, number, number] = [255, 255, 255],
): Uint8ClampedArray {
  const { V, width, height } = result;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const t = V[i];
    out[i * 4]     = colorLow[0] + t * (colorHigh[0] - colorLow[0]);
    out[i * 4 + 1] = colorLow[1] + t * (colorHigh[1] - colorLow[1]);
    out[i * 4 + 2] = colorLow[2] + t * (colorHigh[2] - colorLow[2]);
    out[i * 4 + 3] = 255;
  }
  return out;
}
