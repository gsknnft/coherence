import { expect } from "vitest";
import type { PolarPoint } from "../../src/superformula.js";

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function addPolarNoise(
  points: PolarPoint[],
  pct: number,
  seed = 1,
): PolarPoint[] {
  const rng = createSeededRng(seed);
  const sigma = Math.max(0, pct);
  return points.map((p) => {
    const jitter = gaussian01(rng) * sigma;
    return {
      angle: p.angle,
      radius: Math.max(0, p.radius * (1 + jitter)),
    };
  });
}

export function downsamplePolar(points: PolarPoint[], n: number): PolarPoint[] {
  if (n >= points.length) return [...points];
  const step = points.length / Math.max(1, n);
  const out: PolarPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(points[Math.floor(i * step)]);
  }
  return out;
}

export function rotatePolar(points: PolarPoint[], delta: number): PolarPoint[] {
  return points.map((p) => ({
    angle: p.angle + delta,
    radius: p.radius,
  }));
}

export function expectMonotonicNonDecreasing(
  values: number[],
  epsilon = 1e-6,
): void {
  for (let i = 1; i < values.length; i += 1) {
    expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] - epsilon);
  }
}

export function expectCloseVector(
  a: Record<string, number>,
  b: Record<string, number>,
  tolerances: Partial<Record<string, number>>,
): void {
  const keys = Object.keys(tolerances);
  for (const key of keys) {
    const tol = tolerances[key]!;
    expect(Number.isFinite(a[key])).toBe(true);
    expect(Number.isFinite(b[key])).toBe(true);
    expect(Math.abs(a[key] - b[key])).toBeLessThanOrEqual(tol);
  }
}

function gaussian01(rng: () => number): number {
  // Box-Muller with epsilon clamps to avoid log(0).
  const u1 = Math.max(1e-12, rng());
  const u2 = Math.max(1e-12, rng());
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

