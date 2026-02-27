import { wt} from '@gsknnft/qwave';
import { QuantumSignalSuite, waveletDWT, fftSpectrum, classifyRegime as cR } from '@sigilnet/qfield';
import {
  dwt,
  WaveletFamily,
  FeatureSet,
  FFTResult,
  Signal,
  FFT
} from "@sigilnet/qtransform";

import { superformulaRadius, SuperformulaParams, PolarPoint, extractGeometricSignature } from './superformula.js';

interface SystemState {
  telemetry: number[];
  holders: PolarPoint[];
}

export function generateRandomPoints(
  count: number,
  rng: () => number = Math.random,
): PolarPoint[] {
  const points: PolarPoint[] = [];
  for (let i = 0; i < count; i++) {
    points.push({
      angle: rng() * 2 * Math.PI,
      radius: rng(),
    });
  }
  return points;
}

export function generateAizawaAttractor(
  x0: number,
  y0: number,
  z0: number,
): PolarPoint[] {
    const a = 0.95;
    const b = 0.7;
    const c = 0.6;
    const d = 3.5;
    const e = 0.25;
    const f = 0.1;
    const dt = 0.01;
    const steps = 10000;
  const trajectory = [];
  let x = x0,
    y = y0,
    z = z0;
  for (let i = 0; i < steps; i++) {
    const dx = (z - b) * x - d * y;
    const dy = d * x + (z - b) * y;
    const dz = c + a * z - (z ** 3) / 3 - (x ** 2 + y ** 2) * (1 + e * z) + f * z * (x ** 3);
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    trajectory.push([x, y, z]);
  }
  // Convert trajectory to PolarPoint[]
  return trajectory.map(([x, y, z]) => {
    const angle = Math.atan2(y, x);
    const radius = Math.sqrt(x * x + y * y);
    return { angle, radius };
  });
}

// export // Combine 1D spectral + 2D geometric
// function analyzeSystemCoherence(system: SystemState) {
//   // 1D: Model behavior telemetry
//   const spectralNegentropy = computeNegentropy(system.telemetry);

//   // 2D: Token holder distributions
//   const geometricSignature = extractGeometricSignature(system.holders);

//   // Combined coherence
//   const totalCoherence =
//     0.6 * spectralNegentropy +
//     0.4 * geometricSignature.symmetry;

//   return {
//     spectral: spectralNegentropy,
//     geometric: geometricSignature,
//     combined: totalCoherence,
//     regime: classifyRegime(totalCoherence)
//   };
// }


export function radialProfileFFT(histogram: number[], harmonics: number) {
  // ... DFT implementation
  const fft = new FFT(histogram);
  const spectrum = fft.createComplexArray();

  fft.realTransform(spectrum, histogram);

  const mags = [];
  const quantumSignalSuite = new QuantumSignalSuite('coherence-analysis');
  const { spectralEntropy, runFullFieldAnalysis } = QuantumSignalSuite;
  const { processAndLog, buildEffsVector, evaluateFieldState,  } = quantumSignalSuite;
  const {entropy, hilbertData, imfs } = runFullFieldAnalysis(Float64Array.from(histogram));
  // const log = processAndLog({ spectralEntropy: entropy, hilbertData, imfs });
  // const dft = wt.dft(histogram);
  // for (let k = 1; k <= K; k += 1) {
  //   for (let n = 0; n < N; n += 1) {
  //     const a = (2 * Math.PI * k * n) / N;
  //     re += histogram[n] * Math.cos(a);
  //     im -= histogram[n] * Math.sin(a);
  //   }
  //   mags.push(Math.sqrt(re * re + im * im));
  // }
  return { spectrum, entropy, hilbertData, imfs };
}
// // Visualize current system regime as superellipse
// export function RegimeShape({ negentropy }: { negentropy: number }) {
//   // Map negentropy to superformula params
//   const params = {
//     m: negentropy > 3 ? 4 : negentropy > 1.5 ? 7 : 23,
//     n1: 2,
//     n2: clamp(negentropy, 0.5, 4),
//     n3: clamp(negentropy, 0.5, 4),
//     a: 1,
//     b: 1
//   };

//   // Render animated superellipse
//   return <SuperellipseCanvas params={params} />;
// }
