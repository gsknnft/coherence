import type { CoherenceState } from "./types.js";

export const DEFAULT_MIN_RESERVE = 0.2;

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

export function cosineSimilarity(signal: number[], intent: number[]): number {
  if (!signal.length || !intent.length) return 0;
  if (signal.length !== intent.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < signal.length; i++) {
    dot += signal[i] * intent[i];
    normA += signal[i] * signal[i];
    normB += intent[i] * intent[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

export function sineSimilarity(signal: number[], intent: number[]): number {
  const cosineSim = cosineSimilarity(signal, intent);
  return Math.sqrt(Math.max(0, 1 - cosineSim * cosineSim));
}

export function euclideanDistance(signal: number[], intent: number[]): number {
  const n = Math.min(signal.length, intent.length);
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const d = signal[i] - intent[i];
    sumSq += d * d;
  }
  return Math.sqrt(sumSq);
}

export function computeSignalPower(signal: number[]): number {
  if (!signal.length) return 0;
  let sumSq = 0;
  for (let i = 0; i < signal.length; i++) sumSq += signal[i] * signal[i];
  return sumSq / signal.length;
}

export async function signalAlignment(
  signal: number[],
  intent: number[],
): Promise<{ alignment: number; distance: number }> {
  const alignment = cosineSimilarity(signal, intent);
  const distance = euclideanDistance(signal, intent);
  return { alignment, distance };
}

export async function characterizeNoise(
  signal: number[],
): Promise<{ noise: number; noiseRatio: number; snr: number; entropy: number }> {
  const n = signal.length || 1;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < signal.length; i++) {
    sum += signal[i];
    sumSq += signal[i] * signal[i];
  }
  const mean = sum / n;
  const signalPower = sumSq / n;
  // variance about the mean = noise power
  let noiseAcc = 0;
  for (let i = 0; i < signal.length; i++) {
    const d = signal[i] - mean;
    noiseAcc += d * d;
  }
  const noise = noiseAcc / n;
  const totalPower = signalPower + noise;
  const snr = noise > 0 ? signalPower / noise : Infinity;
  const entropy = -Math.log2(snr / (snr + 1e-12) + 1e-12);
  const noiseRatio = clamp01(noise / (totalPower || 1e-12));
  return { noise, noiseRatio, snr, entropy };
}

export function computeHorizonSec(
  margin: number,
  drift: number,
  reserve: number,
  minReserve = DEFAULT_MIN_RESERVE,
): number {
  if (drift >= 0) return Number.POSITIVE_INFINITY;
  const effectiveReserve = Math.max(minReserve, clamp01(reserve));
    const d = Math.max(1e-6, Math.abs(drift));
    return (margin / d) * effectiveReserve;
}

export function isUnsafe(state: CoherenceState, minHorizon: number): boolean {
  return state.H < minHorizon;
}
