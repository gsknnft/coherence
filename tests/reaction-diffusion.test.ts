import { describe, expect, it } from "vitest";
import
    {
        computeGrayScott,
        GRAY_SCOTT_PRESETS,
        grayScottToImageData,
    } from "../src/reactionDiffusion";

describe("reaction diffusion", () => {
  it("produces bounded fields with expected dimensions", () => {
    const width = 32;
    const height = 24;
    const result = computeGrayScott({
      width,
      height,
      steps: 80,
      params: GRAY_SCOTT_PRESETS.spots,
      seed: 7,
    });

    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
    expect(result.U.length).toBe(width * height);
    expect(result.V.length).toBe(width * height);

    for (let i = 0; i < result.U.length; i++) {
      expect(result.U[i]).toBeGreaterThanOrEqual(0);
      expect(result.U[i]).toBeLessThanOrEqual(1);
      expect(result.V[i]).toBeGreaterThanOrEqual(0);
      expect(result.V[i]).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic for identical seed and params", () => {
    const a = computeGrayScott({
      width: 24,
      height: 24,
      steps: 60,
      params: GRAY_SCOTT_PRESETS.labyrinth,
      seed: 123,
    });
    const b = computeGrayScott({
      width: 24,
      height: 24,
      steps: 60,
      params: GRAY_SCOTT_PRESETS.labyrinth,
      seed: 123,
    });

    expect(a.V).toEqual(b.V);
    expect(a.U).toEqual(b.U);
  });

  it("converts to RGBA image data", () => {
    const result = computeGrayScott({
      width: 16,
      height: 16,
      steps: 20,
      params: GRAY_SCOTT_PRESETS.frontier,
      seed: 9,
    });
    const image = grayScottToImageData(result, [10, 20, 30], [200, 210, 220]);

    expect(image.length).toBe(16 * 16 * 4);
    for (let i = 0; i < image.length; i += 4) {
      expect(image[i + 3]).toBe(255);
    }
  });
});
