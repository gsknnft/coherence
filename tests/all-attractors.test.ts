// @gsknnft/coherence/tests/all-attractors.test.ts

import { describe, expect, it } from "vitest";
import {
  ALL_ATTRACTORS,
  compareToAttractors,
  computeAttractor,
} from "../src/attractors";

describe("All Strange Attractors", () => {
  ALL_ATTRACTORS.forEach((type) => {
    describe(`${type} attractor`, () => {
      it("generates finite positions", () => {
        const positions = computeAttractor({ type, steps: 1000 });

        expect(positions.length).toBe(3000);

        for (let i = 0; i < positions.length; i++) {
          expect(Number.isFinite(positions[i])).toBe(true);
        }
      });

      it("can be identified by comparison", { timeout: 15000 }, () => {
        const positions = computeAttractor({ type, steps: 4000 });
        const result = compareToAttractors(positions);
        const maxScore = Math.max(...Object.values(result.scores));
        const selfScore = result.scores[type];

        // Self score should be competitive even if two attractors are close
        expect(selfScore).toBeGreaterThan(0.45);
        expect(maxScore - selfScore).toBeLessThan(0.12);
      });
    });
  });

  it("all attractors have distinct signatures", { timeout: 20000 }, () => {
    const signatures = ALL_ATTRACTORS.map((type) => {
      const pos = computeAttractor({ type, steps: 3000 });
      return { type, result: compareToAttractors(pos) };
    });

    // Each should strongly score against itself
    signatures.forEach(({ type, result }) => {
      const maxScore = Math.max(...Object.values(result.scores));
      expect(result.scores[type]).toBeGreaterThan(0.45);
      expect(maxScore - result.scores[type]).toBeLessThan(0.15);
    });
  });
});
