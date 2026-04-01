import { describe, expect, it } from "vitest";
import {
  classifyResonancePhase,
  createResonanceState,
  resolveResonanceSource,
} from "../src/resonance.js";

describe("resonance contract", () => {
  it("classifies phase bands deterministically", () => {
    expect(classifyResonancePhase(0.91)).toBe("coherent");
    expect(classifyResonancePhase(0.7)).toBe("drifting");
    expect(classifyResonancePhase(0.42)).toBe("dissonant");
    expect(classifyResonancePhase(0.18)).toBe("critical");
  });

  it("dampens score under high drift and energy", () => {
    const stable = createResonanceState({
      alignment: 0.9,
      drift: 0.1,
      energy: 0.1,
      confidence: 0.85,
      source: "coherence",
    });
    const strained = createResonanceState({
      alignment: 0.9,
      drift: 0.75,
      energy: 0.7,
      confidence: 0.85,
      source: "coherence",
    });

    expect(stable.score).toBeGreaterThan(strained.score);
    expect(stable.phase).toBe("coherent");
    expect(["dissonant", "critical"]).toContain(strained.phase);
  });

  it("resolves mixed provenance to hybrid", () => {
    expect(resolveResonanceSource(["world"])).toBe("world");
    expect(resolveResonanceSource(["coherence", "world"])).toBe("hybrid");
  });
});
