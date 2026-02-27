import { describe, expect, it } from "vitest";
import {
  classifyDimensionBand,
  estimateCorrelationDimension,
} from "../src/dynamics/dimension.js";

describe("correlation dimension", () => {
  it("preserves geometric ordering across canonical fixtures", () => {
    const curve = buildCanonicalCurve(500);
    const torus = buildCanonicalTorusSurface(1200);
    const diffuse = buildCanonicalDiffuseCloud(1200);

    const curveResult = estimateCorrelationDimension(curve, {
      maxPoints: 180,
      radiusCount: 12,
      theilerWindow: 1,
    });
    const torusResult = estimateCorrelationDimension(torus, {
      maxPoints: 220,
      radiusCount: 12,
      theilerWindow: 0,
    });
    const diffuseResult = estimateCorrelationDimension(diffuse, {
      maxPoints: 220,
      radiusCount: 12,
      theilerWindow: 0,
    });

    expect(curveResult).not.toBeNull();
    expect(torusResult).not.toBeNull();
    expect(diffuseResult).not.toBeNull();

    const dCurve = curveResult?.dimension ?? 0;
    const dTorus = torusResult?.dimension ?? 0;
    const dDiffuse = diffuseResult?.dimension ?? 0;

    expect(dCurve).toBeGreaterThan(0.8);
    expect(dCurve).toBeLessThan(2.3);
    expect(dTorus).toBeGreaterThan(dCurve);
    expect(dDiffuse).toBeGreaterThan(dTorus);
  });

  it("classifies torus-like and diffuse fixtures into expected bands", () => {
    const torus = buildCanonicalTorusSurface(1200);
    const diffuse = buildCanonicalDiffuseCloud(1200);

    const torusResult = estimateCorrelationDimension(torus, {
      maxPoints: 220,
      radiusCount: 12,
      theilerWindow: 0,
    });
    const diffuseResult = estimateCorrelationDimension(diffuse, {
      maxPoints: 220,
      radiusCount: 12,
      theilerWindow: 0,
    });

    expect(torusResult).not.toBeNull();
    expect(diffuseResult).not.toBeNull();

    expect(classifyDimensionBand(torusResult?.dimension)).toBe("torus");
    expect(classifyDimensionBand(diffuseResult?.dimension)).toBe("diffusive");
  });

  it("classifies canonical numeric bands", () => {
    expect(classifyDimensionBand(undefined)).toBe("undetermined");
    expect(classifyDimensionBand(0.1)).toBe("fixed-point");
    expect(classifyDimensionBand(1.02)).toBe("limit-cycle");
    expect(classifyDimensionBand(1.32)).toBe("fractal");
    expect(classifyDimensionBand(2.01)).toBe("torus");
    expect(classifyDimensionBand(2.85)).toBe("diffusive");
  });
});

function buildCanonicalCurve(count: number): Float64Array {
  const out = new Float64Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = (2 * Math.PI * i) / Math.max(1, count - 1);
    out[i * 3] = Math.cos(t);
    out[i * 3 + 1] = Math.sin(t);
    out[i * 3 + 2] = 0.05 * Math.sin(3 * t);
  }
  return out;
}

function buildCanonicalTorusSurface(count: number): Float64Array {
  const out = new Float64Array(count * 3);
  const alpha = Math.SQRT2;
  const beta = Math.sqrt(3); // independent irrational increment (prevents 1D collapse)
  const major = 1.5;
  const minor = 0.45;
  for (let i = 0; i < count; i++) {
    const u = 2 * Math.PI * frac(i * alpha);
    const v = 2 * Math.PI * frac(i * beta);
    out[i * 3] = (major + minor * Math.cos(v)) * Math.cos(u);
    out[i * 3 + 1] = (major + minor * Math.cos(v)) * Math.sin(u);
    out[i * 3 + 2] = minor * Math.sin(v);
  }
  return out;
}

function buildCanonicalDiffuseCloud(count: number): Float64Array {
  const out = new Float64Array(count * 3);
  const a = (1 + Math.sqrt(5)) / 2;
  const b = Math.SQRT2;
  const c = Math.sqrt(3);
  for (let i = 0; i < count; i++) {
    out[i * 3] = 2 * frac(i * a) - 1;
    out[i * 3 + 1] = 2 * frac(i * b) - 1;
    out[i * 3 + 2] = 2 * frac(i * c) - 1;
  }
  return out;
}

function frac(x: number): number {
  return x - Math.floor(x);
}
