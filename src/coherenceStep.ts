import { cosineSimilarity, characterizeNoise } from './invariants.js';
import { sigAnalysis } from './qvariants.js';

import { CommitmentDetector } from './commitment-detector.js';
import type { CoherencePrimitives, CouplingParams } from './types.js';

const detector = new CommitmentDetector();

/** Arithmetic mean and population standard deviation of a numeric array. */
function meanStd(signal: number[]): { mean: number; std: number } {
  const n = signal.length;
  if (!n) return { mean: 0, std: 0 };
  let sum = 0;
  for (let i = 0; i < n; i++) sum += signal[i];
  const mean = sum / n;
  let varAcc = 0;
  for (let i = 0; i < n; i++) {
    const d = signal[i] - mean;
    varAcc += d * d;
  }
  return { mean, std: Math.sqrt(varAcc / n) };
}

const totalPower = (signal: number[]): number =>
  signal.reduce((sum, val) => sum + val * val, 0) / signal.length;

async function coherenceStep(signal: number[], intent: number[], { loop, params }: { loop: CoherencePrimitives, params: CouplingParams }) {
  // Step 1. Estimate system parameters
  const { M, V, R, H } = loop.estimate(params);

  // Step 2. Compute noise / coherence stats
  const { entropy } = await sigAnalysis(signal);
  const power = totalPower(signal);
  const { noise, snr } = await characterizeNoise(signal);

  // Step 3. Compute directional alignment
  const alignment = cosineSimilarity(signal, intent);
  const resonance = 1 - entropy;

  // Step 4. Add a few descriptive stats
  const { mean, std } = meanStd(signal);

  // Step 5. Detect commitment event
  detector.detectCommitment(M, V, {
    R,
    H,
    alignment,
    noise,
    snr,
    mean,
    std,
    entropy,
    resonance,
    sampleCount: signal.length,
    RMS: Math.sqrt(power),
  }, loop.getCurrentCoupling?.());

  return {
    M, V, R, H,
    noise, snr, entropy, alignment, resonance,
    mean, std,
    RMS: Math.sqrt(power),
    events: detector.getEvents(),
  };
}

async function coherenceSteppin(
  signal: number[],
  intent: number[],
  {
    loop,
  }: {
    loop: CoherencePrimitives;
  }
) {
  const M = loop.estimateMargin(signal);
  const V = loop.estimateDrift(signal);
  const R = loop.estimateResponsiveness(signal);

  const power = totalPower(signal);
  const { noise, snr } = await characterizeNoise(signal);
  const { entropy } = await sigAnalysis(signal);

  const alignment = cosineSimilarity(signal, intent);
  const resonance = 1 - entropy;

  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  const std = Math.sqrt(
    signal.reduce((a, b) => a + (b - mean) ** 2, 0) / signal.length
  );

  const C = loop.getCurrentCoupling?.() ?? {};

  detector.detectCommitment(
    M,
    V,
    {
      R,
      alignment,
      noise,
      snr,
      mean,
      std,
      entropy,
      resonance,
      sampleCount: signal.length,
      RMS: Math.sqrt(power),
    },
    C,
    Date.now()
  );

  return {
    M,
    V,
    R,
    alignment,
    noise,
    snr,
    entropy,
    resonance,
    mean,
    std,
    RMS: Math.sqrt(power),
    events: detector.getEvents(),
  };
}

export { coherenceSteppin, coherenceStep };
