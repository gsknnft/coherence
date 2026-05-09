import { describe, expect, it } from "vitest";
import
    {
        orbitalDensity,
        orbitalPointCloud,
        ORBITALS,
        sampleOrbitalVolume,
    } from "../src/schrodinger";

describe("schrodinger orbitals", () => {
  it("computes non-negative orbital density", () => {
    const d = orbitalDensity(1.2, Math.PI / 3, Math.PI / 4, ORBITALS["2p0"]);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThanOrEqual(0);
  });

  it("samples normalized orbital volume grid", () => {
    const res = 20;
    const field = sampleOrbitalVolume({
      params: ORBITALS["3d2"],
      resolution: res,
    });

    expect(field.length).toBe(res ** 3);
    let max = 0;
    let sum = 0;
    for (const v of field) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      if (v > max) max = v;
      sum += v;
    }
    expect(max).toBeGreaterThan(0);
    expect(sum).toBeGreaterThan(0);
  });

  it("generates point cloud samples for an orbital", () => {
    const points = orbitalPointCloud({
      params: ORBITALS["1s"],
      count: 300,
      threshold: 0,
      extent: 6,
    });

    expect(points.length).toBeGreaterThan(0);
    expect(points.length % 3).toBe(0);
    expect(points.length).toBeLessThanOrEqual(300 * 3);
  });
});
