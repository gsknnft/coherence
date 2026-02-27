import { describe, expect, it } from "vitest";
import {
  driftRate,
  type DriftFeatures,
} from "../src/governance/drift.js";
import { evaluateLorentzBarrier } from "../src/governance/lorentz.js";
import {
  posteriorArgmax,
  posteriorConfidence,
  updateRegimePosterior,
  uniformPosterior,
  type RegimePosterior,
} from "../src/regime/bayes-filter.js";

describe("governance stress scenarios", () => {
  it("fixed point keeps low drift and low gamma", () => {
    const seq = Array.from({ length: 40 }, () =>
      makeFeatures({
        health: 0.8,
        lambdaMin: 0.16,
        violationRate: 0.01,
        flowMeanCos: -0.95,
        flowAbsCos: 0.96,
        attractorSim: 0.1,
      }),
    );
    const drift = computeDriftSeries(seq, 1);
    const gamma = drift.map((v) => evaluateLorentzBarrier(v, 0.2).gamma);
    expect(mean(drift)).toBeLessThan(0.01);
    expect(mean(gamma)).toBeLessThan(1.02);
  });

  it("controlled drift ramp produces rising gamma before a spike", () => {
    const seq: DriftFeatures[] = [];
    for (let i = 0; i < 30; i++) {
      seq.push(
        makeFeatures({
          health: 0.75 - i * 0.008,
          lambdaMin: 0.14 - i * 0.003,
          violationRate: 0.02 + i * 0.004,
          flowMeanCos: -0.4 + i * 0.02,
          flowAbsCos: 0.3 + i * 0.01,
          attractorSim: 0.2 + i * 0.012,
        }),
      );
    }
    seq.push(
      makeFeatures({
        health: 0.2,
        lambdaMin: -0.08,
        violationRate: 0.4,
        flowMeanCos: 0.8,
        flowAbsCos: 0.9,
        attractorSim: 0.7,
      }),
    );

    const drift = computeDriftSeries(seq, 1);
    const gamma = drift.map((v) => evaluateLorentzBarrier(v, 0.2).gamma);
    const preSpike = gamma.slice(-6, -1);
    const spike = gamma.at(-1) ?? 1;
    expect(mean(preSpike)).toBeGreaterThan(1.0);
    expect((preSpike.at(-1) ?? 1) + 1e-12).toBeGreaterThanOrEqual(preSpike[0] ?? 1);
    expect(spike).toBeGreaterThan(mean(preSpike));
  });

  it("chaotic/noise sequence drives lower posterior confidence than stable sequence", () => {
    const stable = Array.from({ length: 40 }, (_, i) =>
      observation({
        health: 0.75 + Math.sin(i * 0.05) * 0.02,
        lambdaMin: 0.12 + Math.cos(i * 0.04) * 0.02,
        violationRate: 0.03 + Math.sin(i * 0.07) * 0.01,
        flowMeanCos: -0.85 + Math.sin(i * 0.03) * 0.08,
        flowAbsCos: 0.9,
        attractorSimilarity: 0.2,
        jspaceResolved: true,
        deterministicRegime: "stable-gradient",
      }),
    );
    const chaotic = Array.from({ length: 40 }, (_, i) =>
      observation({
        health: 0.45 + Math.sin(i * 1.3) * 0.2,
        lambdaMin: 0.02 + Math.cos(i * 1.1) * 0.18,
        violationRate: 0.18 + Math.sin(i * 1.7) * 0.16,
        flowMeanCos: Math.sin(i * 1.2) * 0.9,
        flowAbsCos: 0.65 + Math.sin(i * 1.5) * 0.2,
        attractorSimilarity: 0.75 + Math.sin(i * 1.2) * 0.15,
        jspaceResolved: false,
        deterministicRegime: "chaotic",
      }),
    );

    const stableStats = runPosterior(stable);
    const chaoticStats = runPosterior(chaotic);

    expect(stableStats.meanConfidence).toBeGreaterThan(chaoticStats.meanConfidence);
    expect(stableStats.topRegime).toBe("stable-gradient");
    expect(chaoticStats.topRegime).toBe("chaotic");
  });
});

function runPosterior(obs: any[]) {
  let posterior: RegimePosterior = uniformPosterior();
  const confidences: number[] = [];
  for (const o of obs) {
    posterior = updateRegimePosterior(posterior, o);
    confidences.push(posteriorConfidence(posterior));
  }
  return {
    meanConfidence: mean(confidences),
    topRegime: posteriorArgmax(posterior),
  };
}

function computeDriftSeries(seq: DriftFeatures[], dt: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < seq.length; i++) {
    out.push(driftRate(seq[i], seq[i - 1], dt));
  }
  return out;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function makeFeatures(v: DriftFeatures): DriftFeatures {
  return v;
}

function observation(v: any) {
  return v;
}
