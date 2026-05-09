import { describe, expect, it } from "vitest";
import
    {
        evalSHLighting,
        shRadius,
        sphericalHarmonicBasis,
        Ylm,
    } from "../src/sphericalHarmonics";

describe("spherical harmonics", () => {
  it("Y00 is constant across angles", () => {
    const a = Ylm(0, 0, 0.2, 1.1);
    const b = Ylm(0, 0, 2.4, 5.5);
    expect(a).toBeCloseTo(b, 12);
    expect(a).toBeGreaterThan(0);
  });

  it("builds basis with expected size", () => {
    const lMax = 4;
    const basis = sphericalHarmonicBasis(Math.PI / 3, Math.PI / 7, lMax);
    expect(basis.length).toBe((lMax + 1) * (lMax + 1));
    for (const v of basis) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("applies radius clamping for SH deformation", () => {
    const lMax = 2;
    const coeffs = new Array((lMax + 1) * (lMax + 1)).fill(0);
    coeffs[5] = 10;
    const r = shRadius(0.9, 2.1, {
      coefficients: coeffs,
      lMax,
      minR: 0.8,
      maxR: 1.2,
    });
    expect(r).toBeGreaterThanOrEqual(0.8);
    expect(r).toBeLessThanOrEqual(1.2);
  });

  it("evaluates non-negative SH lighting output", () => {
    const coeffs = new Float64Array(27);
    coeffs[0] = 1;
    coeffs[1] = 0.5;
    coeffs[2] = 0.25;

    const [r, g, b] = evalSHLighting(Math.PI / 2, Math.PI / 4, coeffs);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(r).toBeGreaterThan(0);
  });
});
