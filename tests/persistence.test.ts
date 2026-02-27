import { describe, expect, it } from "vitest";
import { evaluateStructuralPersistence } from "../src/governance/persistence.js";

describe("structural persistence index", () => {
  it("passes stable windows with bounded drift and sustained basin hold", () => {
    const observations = Array.from({ length: 18 }, (_, i) => ({
      ts: 1_700_000_000_000 + i * 1000,
      dimension: 1.95 + Math.sin(i * 0.1) * 0.04,
      flowAlignment: -0.92 + Math.sin(i * 0.2) * 0.03,
      gamma: 1.06 + Math.cos(i * 0.15) * 0.03,
      posteriorEntropy: 0.32 - i * 0.004,
      driftRate: 0.08 + Math.sin(i * 0.12) * 0.01,
      basinHold: true,
      coherenceDensity: 0.78 + Math.cos(i * 0.2) * 0.03,
    }));

    const result = evaluateStructuralPersistence(observations);

    expect(result.gatePassed).toBe(true);
    expect(result.score).toBeGreaterThan(0.62);
    expect(result.metastability).toBeLessThan(0.45);
  });

  it("flags metastable windows with accelerating drift and basin loss", () => {
    const observations = Array.from({ length: 18 }, (_, i) => ({
      ts: 1_700_000_000_000 + i * 1000,
      dimension: i < 9 ? 1.9 : 2.7,
      flowAlignment: i < 9 ? -0.4 : 0.35,
      gamma: i < 9 ? 1.15 : 2.4 + i * 0.03,
      posteriorEntropy: 0.25 + i * 0.02,
      driftRate: 0.05 + i * i * 0.01,
      basinHold: i < 8,
      coherenceDensity: i < 9 ? 0.7 : 0.2,
    }));

    const result = evaluateStructuralPersistence(observations);

    expect(result.gatePassed).toBe(false);
    expect(result.metastability).toBeGreaterThan(0.5);
    expect(["drift-acceleration", "barrier-instability", "basin-loss"]).toContain(
      result.dominantRisk,
    );
  });
});
