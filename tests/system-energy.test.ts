import { describe, expect, it } from "vitest";
import {
  classifySystemEnergyBand,
  resolveSystemEnergy,
} from "../src/system-energy.js";

describe("system energy", () => {
  it("classifies energy bands deterministically", () => {
    expect(classifySystemEnergyBand(0.12)).toBe("calm");
    expect(classifySystemEnergyBand(0.32)).toBe("attentive");
    expect(classifySystemEnergyBand(0.66)).toBe("caution");
    expect(classifySystemEnergyBand(0.78)).toBe("alert");
    expect(classifySystemEnergyBand(0.93)).toBe("critical");
  });

  it("resolves the expected caution band from mixed stress signals", () => {
    const state = resolveSystemEnergy({
      pressure: 1,
      instability: 0.65,
      entropy: 0.36,
      latencyMs: 420,
      resonance: 0.43,
    });

    expect(state.energy).toBeCloseTo(0.67, 2);
    expect(state.band).toBe("caution");
    expect(state.stabilityMargin).toBeCloseTo(0.33, 2);
  });

  it("stays pure and treats missing instability as zero", () => {
    const calm = resolveSystemEnergy({
      pressure: 0.15,
      instability: 0.1,
      entropy: 0.2,
      latencyMs: 80,
      resonance: 0.88,
    });
    const fragile = resolveSystemEnergy({
      pressure: 0.7,
      instability: 0.65,
      entropy: 0.35,
      latencyMs: 360,
      resonance: 0.42,
    });

    expect(calm.band).toBe("calm");
    expect(fragile.band).toBe("caution");
    expect(fragile.energy).toBeGreaterThan(calm.energy);
  });
});
