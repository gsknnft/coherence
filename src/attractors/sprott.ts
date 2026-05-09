// Sprott attractor family — Julien Sprott's catalogue of minimal chaotic systems
// Each variant (A–S) is a simple 3-equation system requiring only 1 nonlinear term
// References: Sprott (1994), "Some simple chaotic flows"
//
// All variants return Float64Array interleaved x,y,z

export type SprottVariant = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

export interface SprottConfig {
  variant: SprottVariant;
  steps?: number;
  dt?: number;
  initialPoint?: { x: number; y: number; z: number };
}

// One nonlinear term each (a/b constants per variant)
const VARIANT_PARAMS: Record<SprottVariant, { a: number; b: number }> = {
  A: { a: 0.0,  b: 0.0  }, // Sprott A — NE8 system
  B: { a: 0.4,  b: 1.2  }, // Sprott B
  C: { a: 0.0,  b: 0.0  }, // Sprott C — simplest 3D chaos
  D: { a: 3.0,  b: 0.0  }, // Sprott D
  E: { a: 0.0,  b: 0.0  }, // Sprott E
  F: { a: 0.5,  b: 0.0  }, // Sprott F
  G: { a: 0.4,  b: 0.0  }, // Sprott G
  H: { a: 0.5,  b: 0.0  }, // Sprott H
  I: { a: 0.2,  b: 0.0  }, // Sprott I
  J: { a: 2.0,  b: 0.0  }, // Sprott J
  K: { a: 0.3,  b: 0.0  }, // Sprott K
  L: { a: 3.9,  b: 0.9  }, // Sprott L — Sprott-Linz attractor
};

function stepVariant(variant: SprottVariant, x: number, y: number, z: number, p: { a: number; b: number }): [number, number, number] {
  const { a, b } = p;
  switch (variant) {
    case "A": return [y, -x + y * z,            1 - x * x     ];
    case "B": return [y * z, x - y,             1 - x * y     ];
    case "C": return [y * z, x - y,             1 - x * x     ];
    case "D": return [-y, x + z,                x * z + a * y * y];
    case "E": return [y * z, x * x - y,         1 - 4 * x     ];
    case "F": return [y + z, -x + a * y,        x * x - z     ];
    case "G": return [a * x + z, x * z - y,    -x + y        ];
    case "H": return [-y + z * z, x + a * y,   x - z         ];
    case "I": return [-a * y, x + z,            x * y - z     ];
    case "J": return [a * z, -a * y,            z + x * y - z * z];
    case "K": return [x * y - z, x - y,         x + a * z     ];
    case "L": return [y + a * z, b * x * x - y, 1 - x         ];
  }
}

export function computeSprott({
  variant,
  steps = 10000,
  dt = 0.05,
  initialPoint,
}: SprottConfig): Float64Array {
  const p = VARIANT_PARAMS[variant];
  let { x, y, z } = { x: 0.1, y: 0, z: 0, ...initialPoint };
  const out = new Float64Array(steps * 3);
  for (let i = 0; i < steps; i++) {
    const [dx, dy, dz] = stepVariant(variant, x, y, z, p);
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    out[i * 3]     = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

// Best variants for visual use in games:
// B  — smooth double-scroll (good for energy shields)
// C  — compact, spherical (good for orbs/particles)
// L  — Linz-Sprott, wing-like (good for nebula wisps)
// D  — 3-lobe spiral (good for planetary orbital paths)
