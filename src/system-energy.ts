import type { SystemEnergyBand, SystemEnergyInput, SystemEnergyState } from "./types.js";

const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? Number(value.toFixed(4)) : 0));

export function classifySystemEnergyBand(energy: number): SystemEnergyBand {
  const normalized = clamp01(energy);
  if (normalized >= 0.85) return "critical";
  if (normalized >= 0.7) return "alert";
  if (normalized >= 0.5) return "caution";
  if (normalized >= 0.3) return "attentive";
  return "calm";
}

export function resolveSystemEnergy(input: SystemEnergyInput): SystemEnergyState {
  const pressure = clamp01(input.pressure ?? 0);
  const instability = clamp01(input.instability ?? 0);
  const entropy = clamp01(input.entropy ?? 0);
  const latency = clamp01(normalizeLatencyMs(input.latencyMs));
  const resonanceLoss = clamp01(1 - clamp01(input.resonance ?? 0.5));

  const energy = clamp01(
    0.3 * pressure +
      0.25 * instability +
      0.15 * entropy +
      0.1 * latency +
      0.2 * resonanceLoss,
  );

  return {
    energy,
    band: classifySystemEnergyBand(energy),
    stabilityMargin: clamp01(1 - energy),
    components: {
      pressure,
      instability,
      entropy,
      latency,
      resonanceLoss,
    },
  };
}

function normalizeLatencyMs(latencyMs: number | null | undefined): number {
  if (!Number.isFinite(latencyMs)) return 0;
  return Math.min(Math.max(latencyMs ?? 0, 0), 1000) / 1000;
}
