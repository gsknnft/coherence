// Real spherical harmonics Y_l^m(θ, φ) up to l = 5
//
// Useful for:
//   - Planet surface deformation (mix harmonics → non-spherical world shapes)
//   - Electron orbital probability density shells (s/p/d/f/g orbitals)
//   - Energy shield "lobe" patterns
//   - Lighting environment maps (SH lighting, 9-coefficient l=0..2)
//
// Convention: θ = polar (0=north pole → π=south pole), φ = azimuth [0, 2π)
// Normalization: orthonormal on the unit sphere

// ── Associated Legendre polynomials (Condon-Shortley phase) ──────────────────

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// P_l^|m|(x) — associated Legendre polynomial, m ≥ 0
function legendreP(l: number, m: number, x: number): number {
  // Compute P_m^m first, then step up to P_l^m
  let pmm = 1;
  if (m > 0) {
    const sx = Math.sqrt(1 - x * x);
    let fact = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * sx;
      fact += 2;
    }
  }
  if (l === m) return pmm;
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;
  let plm = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    plm = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = plm;
  }
  return plm;
}

// ── Normalization constant K(l, m) ────────────────────────────────────────────

function kFactor(l: number, m: number): number {
  const num = (2 * l + 1) * factorial(l - Math.abs(m));
  const den = 4 * Math.PI * factorial(l + Math.abs(m));
  return Math.sqrt(num / den);
}

// ── Real spherical harmonic Y_l^m(θ, φ) ──────────────────────────────────────

/**
 * Evaluates the real-valued spherical harmonic Y_l^m at (θ, φ).
 * Returns a scalar value in [-1, 1] approximately.
 * @param l  Degree (0 ≤ l ≤ 5)
 * @param m  Order (-l ≤ m ≤ l)
 * @param theta  Polar angle [0, π]
 * @param phi    Azimuthal angle [0, 2π)
 */
export function Ylm(l: number, m: number, theta: number, phi: number): number {
  const cosTheta = Math.cos(theta);
  const K = kFactor(l, m);
  if (m === 0) {
    return K * legendreP(l, 0, cosTheta);
  } else if (m > 0) {
    return Math.SQRT2 * K * Math.cos(m * phi) * legendreP(l, m, cosTheta);
  } else {
    return Math.SQRT2 * K * Math.sin(-m * phi) * legendreP(l, -m, cosTheta);
  }
}

// ── Convenience: evaluate all Y_l^m for l = 0..lMax on unit sphere point ────

/**
 * Returns all SH coefficients for a given direction, up to degree lMax.
 * Result length = (lMax + 1)²
 */
export function sphericalHarmonicBasis(
  theta: number,
  phi: number,
  lMax = 4,
): Float64Array {
  const size = (lMax + 1) * (lMax + 1);
  const out = new Float64Array(size);
  let idx = 0;
  for (let l = 0; l <= lMax; l++) {
    for (let m = -l; m <= l; m++) {
      out[idx++] = Ylm(l, m, theta, phi);
    }
  }
  return out;
}

// ── Radial deformation: displace unit sphere by SH mix ───────────────────────

export interface SHDeformParams {
  /** Coefficients c_{lm} indexed by (l,m). Length must be (lMax+1)². */
  coefficients: Float64Array | number[];
  lMax?: number;
  /** Clamp radius to [minR, maxR] to avoid self-intersection */
  minR?: number;
  maxR?: number;
}

/**
 * Given spherical angles, returns the radial displacement r = 1 + Σ c_{lm} Y_l^m(θ, φ).
 * Use this to deform a sphere mesh: multiply each vertex position by r(θ,φ).
 */
export function shRadius(theta: number, phi: number, params: SHDeformParams): number {
  const { coefficients, lMax = 4, minR = 0.5, maxR = 2.0 } = params;
  const basis = sphericalHarmonicBasis(theta, phi, lMax);
  let r = 1;
  for (let i = 0; i < basis.length && i < coefficients.length; i++) {
    r += coefficients[i] * basis[i];
  }
  return Math.max(minR, Math.min(maxR, r));
}

// ── Pre-built coefficient sets for game use ───────────────────────────────────

export interface SHPreset {
  name: string;
  lMax: number;
  /** coefficients [c_00, c_1-1, c_10, c_11, c_2-2, ...] */
  coefficients: number[];
}

export const SH_PRESETS: Record<string, SHPreset> = {
  // Nearly sphere — subtle oblate squash
  oblate: {
    name: "Oblate", lMax: 2,
    coefficients: [0, 0, 0, 0, 0, -0.18, 0, 0, 0],
  },
  // Prolate — egg shape
  prolate: {
    name: "Prolate", lMax: 2,
    coefficients: [0, 0, 0, 0, 0, 0.22, 0, 0, 0],
  },
  // Rocky asteroid — mix of l=2 and l=3 terms
  asteroid: {
    name: "Asteroid", lMax: 3,
    coefficients: [0, 0.05, -0.1, 0.05, 0.12, -0.08, 0.06, 0.04, -0.1, 0.07, -0.05, 0.09, -0.04, 0.06, -0.08, 0.05],
  },
  // d-orbital (l=2, m=0) — two-lobe peanut shape
  dOrbital: {
    name: "d-Orbital (dz²)", lMax: 2,
    coefficients: [0, 0, 0, 0, 0, 0.45, 0, 0, 0],
  },
  // p-orbital (l=1, m=±1) — dumbbell
  pOrbital: {
    name: "p-Orbital (px)", lMax: 1,
    coefficients: [0, 0.6, 0, 0],
  },
  // f-orbital character (l=3 dominated)
  fOrbital: {
    name: "f-Orbital", lMax: 3,
    coefficients: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, -0.4, 0, 0.3, 0, 0],
  },
};

// ── SH lighting: reconstruct irradiance from 9-coefficient (l≤2) basis ────

/**
 * Evaluate SH-encoded environment lighting at a surface normal direction.
 * Expects 9 coefficients (RGB triples) ordered l=0,1,2 all m.
 * Returns [R, G, B] irradiance.
 */
export function evalSHLighting(
  normalTheta: number,
  normalPhi: number,
  shCoeffs: Float64Array, // length 27: 9 × [r, g, b]
): [number, number, number] {
  const basis = sphericalHarmonicBasis(normalTheta, normalPhi, 2);
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < 9; i++) {
    r += basis[i] * shCoeffs[i * 3];
    g += basis[i] * shCoeffs[i * 3 + 1];
    b += basis[i] * shCoeffs[i * 3 + 2];
  }
  return [Math.max(0, r), Math.max(0, g), Math.max(0, b)];
}
