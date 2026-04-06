## Strange Attractor Detection

VeraOS includes detection for three classic chaotic attractors:

### Supported Attractors

**Lorenz Attractor (1963)**

- Shape: Butterfly with two lobes
- Equations: σ(y-x), x(ρ-z)-y, xy-βz
- Default: σ=10, ρ=28, β=8/3
- Signature: High fit error (>0.3), low symmetry (<0.5)

**Rössler Attractor (1976)**

- Shape: Single spiral band
- Equations: -y-z, x+ay, b+z(x-c)
- Default: a=0.2, b=0.2, c=5.7
- Signature: High fit error (>0.3), very low symmetry (<0.4)

**Aizawa Attractor (1979)**

- Shape: Complex multi-modal
- Equations: See implementation
- Default: a=0.95, b=0.7, c=0.6, d=3.5, e=0.25, f=0.1
- Signature: High fit error (>0.4), low symmetry (<0.4)

### Usage

```typescript
import { compareToAttractors } from "@gsknnft/coherence/attractors";

const result = compareToAttractors(systemBehavior, "xy");

if (result.bestMatch === "lorenz") {
  console.log("System exhibits Lorenz-like chaos!");
  console.log(`Similarity: ${result.similarity}`);
}
```

### Regime Classification

- **Coherent**: Doesn't match attractors, low fit error
- **Turbulent**: Some irregularity, medium fit error
- **Chaotic**: Matches known attractor (similarity > 0.7)
- **Predatory**: High fit error but doesn't match known attractors
