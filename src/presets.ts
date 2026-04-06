// @gsknnft/coherence/src/presets.ts

import type { SuperformulaParams } from "./superformula.js";

export const SUPERFORMULA_PRESETS = {
  coherent: {
    name: "Classic round-ish (coherent)",
    params: { m: 4, n1: 2, n2: 2, n3: 2, a: 1, b: 1 },
  },
  turbulent: {
    name: "Star / spiky (turbulent)",
    params: { m: 5, n1: 0.3, n2: 1.7, n3: 1.7, a: 1, b: 1 },
  },
  chaotic: {
    name: "Lumpy organism (chaotic)",
    params: { m: 3, n1: 1, n2: 0.3, n3: 1.5, a: 1, b: 1 },
  },
  squircle: {
    name: "Squircle vibe (high coherence)",
    params: { m: 4, n1: 10, n2: 10, n3: 10, a: 1, b: 1 },
  },
};

export function matchToPreset(
  params: SuperformulaParams,
): keyof typeof SUPERFORMULA_PRESETS | "unknown" {
  let best: keyof typeof SUPERFORMULA_PRESETS | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [key, preset] of Object.entries(SUPERFORMULA_PRESETS) as Array<
    [
      keyof typeof SUPERFORMULA_PRESETS,
      (typeof SUPERFORMULA_PRESETS)[keyof typeof SUPERFORMULA_PRESETS],
    ]
  >) {
    const p = preset.params;
    const distance =
      Math.abs(params.m - p.m) / 16 +
      Math.abs(params.n1 - p.n1) / 8 +
      Math.abs(params.n2 - p.n2) / 8 +
      Math.abs(params.n3 - p.n3) / 8 +
      Math.abs(params.a - p.a) / 2 +
      Math.abs(params.b - p.b) / 2;

    if (distance < bestDistance) {
      bestDistance = distance;
      best = key;
    }
  }

  return bestDistance <= 0.6 && best ? best : "unknown";
}

/*
// Coherent regime = simple superformula (low m, symmetric n values)
const coherent = { m: 4, n1: 2, n2: 2, n3: 2 }; // Circle

// Chaotic regime = strange attractor (can't fit to simple superformula)
const chaotic = extractGeometricSignature(chaoticPoints);
// → High fitError, low symmetry, resembles Aizawa attractor
*/
