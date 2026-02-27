import { describe, expect, it } from "vitest";
import {
  computeSpectralNegentropyIndex,
  spectralNegentropyDelta,
} from "../src/governance/coherence-density.js";

describe("spectral coherence density", () => {
  it("scores a structured sinusoid above broadband noise", () => {
    const structured = Array.from({ length: 96 }, (_, i) =>
      Math.sin((2 * Math.PI * i) / 24),
    );
    const noise = Array.from({ length: 96 }, (_, i) =>
      Math.sin(i * 1.73) + Math.cos(i * 2.91) + ((i * 17) % 11) / 11,
    );

    const structuredScore = computeSpectralNegentropyIndex(structured);
    const noiseScore = computeSpectralNegentropyIndex(noise);

    expect(structuredScore.score).toBeGreaterThan(noiseScore.score);
    expect(structuredScore.concentration).toBeGreaterThan(noiseScore.concentration);
  });

  it("supports multichannel trajectories and delta comparisons", () => {
    const coherent = Array.from({ length: 64 }, (_, i) => [
      Math.sin(i * 0.2),
      Math.cos(i * 0.2),
      Math.sin(i * 0.1),
    ]);
    const churn = Array.from({ length: 64 }, (_, i) => [
      Math.sin(i * 0.2) + ((i * 13) % 7) * 0.05,
      Math.cos(i * 0.9),
      ((i * 5) % 9) * 0.08,
    ]);

    const a = computeSpectralNegentropyIndex(coherent);
    const b = computeSpectralNegentropyIndex(churn);

    expect(a.channels.length).toBe(3);
    expect(spectralNegentropyDelta(a, b)).toBeLessThan(0);
  });
});
