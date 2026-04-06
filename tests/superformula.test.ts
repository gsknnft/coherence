// @gsknnft/coherence/tests/superformula.test.ts

import { describe, expect, it } from "vitest";
import { fitSuperformula, generateCircle } from "../src/superformula";

describe("Superformula Fitting", () => {
  it("fits perfect circle for mae loss", () => {
    const circle = generateCircle(100, 36);
    const fit = fitSuperformula(circle, {
      seeds: 10,
      iterations: 50,
      randomSeed: 42,
      lossMode: "mae",
      huberDelta: 0.1,
    });
    expect(fit.seedResults[0].fitError).toBeLessThan(0.05);
    expect(fit.seedResults[0].params.m).toBeCloseTo(4);
  });

  it("fits perfect circle for huber loss", () => {
    const circle = generateCircle(100, 36);
    const fit = fitSuperformula(circle, {
      seeds: 10,
      iterations: 50,
      randomSeed: 42,
      lossMode: "huber",
      huberDelta: 0.1,
    });
    expect(fit.seedResults[0].fitError).toBeLessThan(0.05);
    expect(fit.seedResults[0].params.m).toBeCloseTo(4);
  });
});
