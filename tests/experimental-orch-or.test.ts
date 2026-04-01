import { describe, expect, it } from "vitest";
import {
  classifyExperimentalProjectionRegime,
  projectExperimentalOrchOrState,
} from "../src/experimental/orch-or.js";

describe("experimental Orch-OR projection", () => {
  it("projects experimental input into canonical coherence and resonance summaries", () => {
    const projected = projectExperimentalOrchOrState({
      coherence: 0.72,
      entropy: 0.2,
      negentropy: 0.8,
      drift: -0.08,
      confidence: 0.7,
      contributors: [
        { name: "toy-coherence", value: 0.72, weight: 2, source: "coherence" },
        { name: "toy-entropy", value: 0.2, weight: 1, source: "coherence" },
      ],
    });

    expect(projected.source).toBe("experimental-orch-or");
    expect(projected.primitives.M).toBeCloseTo(0.72, 6);
    expect(projected.primitives.V).toBeCloseTo(-0.08, 6);
    expect(projected.primitives.R).toBeCloseTo(0.8, 6);
    expect(projected.primitives.H).toBeGreaterThan(0);
    expect(projected.resonance.phase).toBe("drifting");
    expect(projected.ncf.regime).toBe("coherent");
    expect(projected.diagnostics).toEqual(["reserve_inferred"]);
  });

  it("infers missing entropy-family metrics without inventing a new ontology", () => {
    const projected = projectExperimentalOrchOrState({
      coherence: 0.25,
      drift: 0.04,
    });

    expect(projected.primitives.M).toBeCloseTo(0.25, 6);
    expect(projected.primitives.R).toBeCloseTo(0.25, 6);
    expect(projected.primitives.H).toBe(Number.POSITIVE_INFINITY);
    expect(projected.ncf.entropy).toBeCloseTo(0.75, 6);
    expect(projected.regime).toBe("suppressed-coherence");
    expect(projected.diagnostics).toContain("entropy_inferred");
    expect(projected.diagnostics).toContain("negentropy_inferred");
    expect(projected.diagnostics).toContain("reserve_inferred");
  });

  it("respects explicit regime hints but otherwise classifies deterministically", () => {
    expect(
      classifyExperimentalProjectionRegime({
        coherence: 0.9,
        resonanceScore: 0.9,
      }),
    ).toBe("baseline");

    expect(
      classifyExperimentalProjectionRegime({
        coherence: 0.5,
        resonanceScore: 0.45,
      }),
    ).toBe("perturbed-coherence");

    expect(
      classifyExperimentalProjectionRegime({
        coherence: 0.9,
        resonanceScore: 0.9,
        hint: "suppressed-coherence",
      }),
    ).toBe("suppressed-coherence");
  });
});
