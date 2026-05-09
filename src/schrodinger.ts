// Schrödinger Hydrogen Orbital Probability Densities |ψ_nlm(r,θ,φ)|²
//
// These are the "electron cloud" shapes — the most beautiful math in physics.
// In game use:
//   - Energy shields (orbital lobes around ship)
//   - Station halos / force field emitters
//   - Weapon charge-up VFX (collapsing orbital)
//   - Planet atmosphere layer variation
//   - NEXA faction aesthetic: "coherence resonance" = electron orbital geometry
//
// Units: Bohr radii (a₀). Scale to scene units as needed.
// Reference: Griffiths "Introduction to Quantum Mechanics", ch. 4

import { Ylm } from "./sphericalHarmonics.js";

// ── Associated Laguerre polynomials L_n^α(x) ─────────────────────────────────

function laguerreAssoc(n: number, alpha: number, x: number): number {
  // Rodrigues / recurrence: L_n^α(x)
  if (n === 0) return 1;
  if (n === 1) return 1 + alpha - x;
  let l0 = 1;
  let l1 = 1 + alpha - x;
  for (let k = 2; k <= n; k++) {
    const l2 = ((2 * k - 1 + alpha - x) * l1 - (k - 1 + alpha) * l0) / k;
    l0 = l1;
    l1 = l2;
  }
  return l1;
}

// ── Radial wave function R_nl(r) ──────────────────────────────────────────────

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/**
 * Radial wavefunction R_nl(r) for hydrogen (Z=1).
 * r in Bohr radii (a₀).
 */
function radialWavefunction(n: number, l: number, r: number): number {
  const rho = (2 * r) / n;
  const norm = Math.sqrt(
    (2 / n) ** 3 *
    factorial(n - l - 1) /
    (2 * n * factorial(n + l) ** 3),
  );
  return norm * Math.exp(-rho / 2) * Math.pow(rho, l) * laguerreAssoc(n - l - 1, 2 * l + 1, rho);
}

// ── Full probability density |ψ_nlm|² ────────────────────────────────────────

export interface OrbitalParams {
  n: number;   // principal quantum number (1..5)
  l: number;   // angular quantum number (0..n-1)
  m: number;   // magnetic quantum number (-l..l)
}

/**
 * Evaluate |ψ_nlm(r, θ, φ)|² — the electron probability density.
 * Returns a non-negative real value (probability per unit volume, unnormalized).
 *
 * @param r     Radial distance from nucleus (Bohr radii, a₀)
 * @param theta Polar angle [0, π]
 * @param phi   Azimuthal angle [0, 2π)
 * @param params  Quantum numbers {n, l, m}
 */
export function orbitalDensity(
  r: number,
  theta: number,
  phi: number,
  params: OrbitalParams,
): number {
  const { n, l, m } = params;
  const R = radialWavefunction(n, l, r);
  const Y = Ylm(l, m, theta, phi);
  return R * R * Y * Y;
}

// ── Volume sampler: 3D grid of density values ─────────────────────────────────

export interface OrbitalSampleOptions {
  params: OrbitalParams;
  /** Grid resolution per axis */
  resolution?: number;
  /** Extent in Bohr radii: [-extent, extent] per axis */
  extent?: number;
}

/**
 * Returns a flat Float32Array of density values on a resolution³ grid.
 * Index: [x][y][z] = out[x * res² + y * res + z]
 * Values are normalized to [0, 1].
 */
export function sampleOrbitalVolume({
  params,
  resolution = 32,
  extent,
}: OrbitalSampleOptions): Float32Array {
  const defaultExtent = (params.n * params.n + 2) * 2.5; // auto-scale to orbital size
  const ext = extent ?? defaultExtent;
  const step = (2 * ext) / (resolution - 1);
  const out = new Float32Array(resolution ** 3);

  let maxVal = 0;
  for (let xi = 0; xi < resolution; xi++) {
    const x = -ext + xi * step;
    for (let yi = 0; yi < resolution; yi++) {
      const y = -ext + yi * step;
      for (let zi = 0; zi < resolution; zi++) {
        const z = -ext + zi * step;
        const r = Math.sqrt(x * x + y * y + z * z);
        if (r < 1e-6) { out[xi * resolution ** 2 + yi * resolution + zi] = 0; continue; }
        const theta = Math.acos(z / r);
        const phi   = Math.atan2(y, x) + Math.PI;
        const d = orbitalDensity(r, theta, phi, params);
        out[xi * resolution ** 2 + yi * resolution + zi] = d;
        if (d > maxVal) maxVal = d;
      }
    }
  }

  // Normalize
  if (maxVal > 0) for (let i = 0; i < out.length; i++) out[i] /= maxVal;
  return out;
}

// ── Point cloud: sample the orbital surface above a density threshold ─────────

/**
 * Returns a point cloud (Float32Array, xyz interleaved) sampling the orbital
 * surface where density > threshold. Good for particle VFX.
 */
export function orbitalPointCloud({
  params,
  count = 5000,
  threshold = 0.05,
  extent,
}: {
  params: OrbitalParams;
  count?: number;
  threshold?: number;
  extent?: number;
}): Float32Array {
  const defaultExtent = (params.n * params.n + 2) * 2.5;
  const ext = extent ?? defaultExtent;
  const pts: number[] = [];
  let attempts = 0;

  while (pts.length < count * 3 && attempts < count * 20) {
    attempts++;
    const x = (Math.random() * 2 - 1) * ext;
    const y = (Math.random() * 2 - 1) * ext;
    const z = (Math.random() * 2 - 1) * ext;
    const r = Math.sqrt(x * x + y * y + z * z);
    if (r < 0.1) continue;
    const theta = Math.acos(Math.min(1, Math.max(-1, z / r)));
    const phi   = Math.atan2(y, x) + Math.PI;
    const d = orbitalDensity(r, theta, phi, params);
    if (d > threshold * Math.random()) {
      pts.push(x, y, z);
    }
  }

  return new Float32Array(pts);
}

// ── Named orbitals ─────────────────────────────────────────────────────────────

export const ORBITALS = {
  "1s":  { n: 1, l: 0, m:  0 },  // sphere
  "2s":  { n: 2, l: 0, m:  0 },  // sphere with node ring
  "2p0": { n: 2, l: 1, m:  0 },  // dumbbell along Z
  "2p1": { n: 2, l: 1, m:  1 },  // dumbbell in XY
  "3d0": { n: 3, l: 2, m:  0 },  // double dumbbell + torus
  "3d2": { n: 3, l: 2, m:  2 },  // four-leaf clover
  "4f0": { n: 4, l: 3, m:  0 },  // complex multi-lobe
  "4f2": { n: 4, l: 3, m:  2 },  // flower with 6 lobes
  "5g0": { n: 5, l: 4, m:  0 },  // extreme multi-lobe
} satisfies Record<string, OrbitalParams>;
