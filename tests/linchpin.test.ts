import { describe, expect, it } from "vitest";
import { analyzeLinchpin } from "../src/governance/linchpin.js";

describe("linchpin analysis", () => {
  it("identifies alignmentDelta as strongest predictor in synthetic transition stream", () => {
    const obs = buildObservations(90, (i) => {
      const transition = i > 0 && i % 15 === 0;
      return {
        transition,
        regime: transition ? "chaotic" : "turbulent",
        alignment: Math.sin(i * 0.12) * 0.2,
        alignmentDelta: i > 0 && (i + 1) % 15 === 0 ? 0.9 : Math.sin(i * 0.3) * 0.05,
        driftRate: 0.12 + Math.cos(i * 0.2) * 0.02,
        gamma: 1.05 + Math.cos(i * 0.1) * 0.04,
        entropy: 0.45 + Math.sin(i * 0.09) * 0.06,
        lambdaMin: 0.06 + Math.cos(i * 0.08) * 0.02,
        attractorSimilarity: 0.55 + Math.sin(i * 0.07) * 0.06,
      };
    });

    const result = analyzeLinchpin(obs, {
      maxLeadSteps: 2,
      minSamples: 30,
      minEvents: 3,
    });

    expect(result.best).not.toBeNull();
    expect(result.best?.metric).toBe("alignmentDelta");
    expect(result.ranking.length).toBeGreaterThan(1);
    expect(result.transitionCount).toBeGreaterThan(3);
  });

  it("returns insufficient transition notes when no transitions exist", () => {
    const obs = buildObservations(64, (i) => ({
      regime: "stable-gradient",
      transition: false,
      alignment: -0.9 + Math.sin(i * 0.03) * 0.02,
      driftRate: 0.01 + Math.cos(i * 0.08) * 0.005,
      gamma: 1.0,
      entropy: 0.05,
      lambdaMin: 0.12,
    }));

    const result = analyzeLinchpin(obs, {
      minSamples: 24,
      minEvents: 2,
    });

    expect(result.best).toBeNull();
    expect(result.notes).toContain("insufficient_transition_events");
  });
});

function buildObservations(
  count: number,
  at: (index: number) => Record<string, unknown>,
) {
  return Array.from({ length: count }, (_, i) => ({
    ts: 1_700_000_000_000 + i * 1000,
    ...at(i),
  }));
}
