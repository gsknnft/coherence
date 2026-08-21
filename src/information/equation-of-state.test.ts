import { describe, expect, it } from "vitest";
import {
  checkEquationOfState,
  fitGibbs,
  fitGibbsToObserved,
  gibbsResidual,
  heatCapacitySweep,
  type GibbsState,
} from "./equation-of-state.js";

const LEVELS = [0, 1, 2, 3, 4, 5];

/** Boltzmann distribution for known energies and beta, built independently. */
function boltzmannReference(energies: readonly number[], beta: number): number[] {
  const weights = energies.map((e) => Math.exp(-beta * e));
  const z = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / z);
}

function state(energies: readonly number[], beta: number): GibbsState {
  const p = boltzmannReference(energies, beta);
  const mean = p.reduce((s, pi, i) => s + pi * energies[i]!, 0);
  const fit = fitGibbs(energies, mean);
  if (fit.kind !== "value") throw new Error(fit.reason);
  return fit.state;
}

describe("Gibbs fit", () => {
  it("recovers a beta it was not given", () => {
    // Build a Boltzmann distribution at a known beta, hand the fit only its mean
    // energy, and check the multiplier comes back.
    for (const trueBeta of [-1.2, -0.3, 0.15, 0.8, 2.5]) {
      const p = boltzmannReference(LEVELS, trueBeta);
      const mean = p.reduce((s, pi, i) => s + pi * LEVELS[i]!, 0);

      const fit = fitGibbs(LEVELS, mean);
      if (fit.kind !== "value") throw new Error(fit.reason);
      expect(fit.state.beta).toBeCloseTo(trueBeta, 6);
      expect(fit.state.meanEnergy).toBeCloseTo(mean, 8);
    }
  });

  it("gives beta = 0 and a uniform distribution for the midpoint energy", () => {
    // Maximum entropy with no effective constraint: infinite temperature.
    const midpoint = (Math.min(...LEVELS) + Math.max(...LEVELS)) / 2;
    const fit = fitGibbs(LEVELS, midpoint);
    if (fit.kind !== "value") throw new Error(fit.reason);

    expect(fit.state.beta).toBeCloseTo(0, 8);
    expect(fit.state.effectiveTemperature).toBe(Infinity);
    for (const p of fit.state.distribution) expect(p).toBeCloseTo(1 / LEVELS.length, 8);
  });

  it("reports a negative temperature rather than clamping it", () => {
    // A distribution favouring high-energy outcomes has beta < 0. That is
    // ordinary for a bounded spectrum, not an error state.
    const fit = fitGibbs(LEVELS, 4);
    if (fit.kind !== "value") throw new Error(fit.reason);
    expect(fit.state.beta).toBeLessThan(0);
    expect(fit.state.effectiveTemperature).toBeLessThan(0);
  });

  it("satisfies S = beta<E> + logZ, which is the identity everything rests on", () => {
    const fit = fitGibbs(LEVELS, 1.5);
    if (fit.kind !== "value") throw new Error(fit.reason);
    const { beta, meanEnergy, logZ, entropy, distribution } = fit.state;

    const shannonNats = -distribution.reduce((s, p) => (p > 0 ? s + p * Math.log(p) : s), 0);
    expect(entropy).toBeCloseTo(beta * meanEnergy + logZ, 10);
    expect(entropy).toBeCloseTo(shannonNats, 10);
  });

  it("declines at the edge of the energy range instead of returning a bound artifact", () => {
    // Beta is genuinely infinite here. A large finite number would be a property
    // of BETA_BOUND, not a measurement.
    for (const target of [0, 5, -1, 6]) {
      const fit = fitGibbs(LEVELS, target);
      expect(fit.kind).toBe("unavailable");
      if (fit.kind !== "unavailable") continue;
      expect(fit.reason).toMatch(/infinite|outside the energy range/);
    }
  });

  it("declines when every outcome has the same energy", () => {
    const fit = fitGibbs([2, 2, 2, 2], 2);
    expect(fit.kind).toBe("unavailable");
    if (fit.kind !== "unavailable") return;
    expect(fit.reason).toMatch(/unidentifiable/);
  });
});

describe("the equation of state, dS = beta d<E>", () => {
  it("holds, with a residual that shrinks quadratically as the step shrinks", () => {
    // The relation is a differential identity. Over a finite step beta itself
    // moves, so the residual is second order — and watching it fall as the step
    // halves is what distinguishes a computed identity from an asserted one.
    const residualFor = (step: number): number => {
      const before = state(LEVELS, 0.8);
      const after = state(LEVELS, 0.8 + step);
      const check = checkEquationOfState(before, after);
      return Math.abs(check.residual);
    };

    const coarse = residualFor(0.2);
    const medium = residualFor(0.1);
    const fine = residualFor(0.05);

    expect(medium).toBeLessThan(coarse);
    expect(fine).toBeLessThan(medium);
    // Halving the step should cut the residual by roughly four, not two.
    expect(coarse / medium).toBeGreaterThan(3);
    expect(medium / fine).toBeGreaterThan(3);
  });

  it("is essentially exact in the small-step limit", () => {
    const before = state(LEVELS, 1.0);
    const after = state(LEVELS, 1.0001);
    const check = checkEquationOfState(before, after);

    expect(check.relativeResidual).not.toBeNull();
    expect(check.relativeResidual!).toBeLessThan(1e-6);
    expect(check.predictedEntropyChange).toBeCloseTo(check.entropyChange, 10);
  });

  it("puts entropy and energy on opposite sides for positive beta", () => {
    // Raising beta concentrates the distribution: energy falls, entropy falls
    // with it, and beta > 0 is exactly the statement that they move together.
    const before = state(LEVELS, 0.5);
    const after = state(LEVELS, 1.5);
    const check = checkEquationOfState(before, after);

    expect(check.energyChange).toBeLessThan(0);
    expect(check.entropyChange).toBeLessThan(0);
    expect(check.midpointBeta).toBeGreaterThan(0);
  });
});

describe("fit quality is a separate question from fit success", () => {
  it("has zero residual when the observation IS a Boltzmann distribution", () => {
    const observed = boltzmannReference(LEVELS, 0.7);
    const fit = fitGibbsToObserved(observed, LEVELS);
    if (fit.kind !== "value") throw new Error(fit.reason);

    const residual = gibbsResidual(observed, fit.state.distribution);
    expect(residual).not.toBeNull();
    expect(residual!).toBeCloseTo(0, 8);
  });

  it("has a large residual when the mean energy does not summarise the shape", () => {
    // Fitting a temperature always succeeds. This is the check on whether the
    // temperature describes anything — here a bimodal distribution whose mean
    // sits in the empty middle.
    const bimodal = [0.45, 0.03, 0.02, 0.02, 0.03, 0.45];
    const fit = fitGibbsToObserved(bimodal, LEVELS);
    if (fit.kind !== "value") throw new Error(fit.reason);

    const residual = gibbsResidual(bimodal, fit.state.distribution);
    expect(residual).not.toBeNull();
    // The fit lands near uniform; the observation is nothing like it.
    expect(residual!).toBeGreaterThan(0.3);
  });
});

describe("heat capacity as a transition indicator", () => {
  it("peaks at a finite beta and vanishes at both extremes", () => {
    // C = beta^2 Var(E) is zero at beta = 0 (no beta^2) and zero at large |beta|
    // (the distribution is a point mass, so no variance). The peak between them
    // is where the distribution is maximally responsive.
    const betas = Array.from({ length: 121 }, (_, i) => -3 + i * 0.05);
    const sweep = heatCapacitySweep(LEVELS, betas);
    if (sweep.kind !== "value") throw new Error(sweep.reason);

    const at = (beta: number) => sweep.sweep.find((s) => Math.abs(s.beta - beta) < 1e-9)!.heatCapacity;
    expect(at(0)).toBeCloseTo(0, 10);

    const peak = sweep.sweep.find((s) => s.beta === sweep.peakBeta)!;
    expect(peak.heatCapacity).toBeGreaterThan(at(0));
    expect(peak.heatCapacity).toBeGreaterThan(at(-3));
    expect(peak.heatCapacity).toBeGreaterThan(at(3));
    expect(peak.normalized).toBeCloseTo(1, 10);
  });

  it("marks a two-level system's peak near the level splitting", () => {
    // For a two-level system with gap 1, C peaks at beta ~ 2.4 (the Schottky
    // anomaly). A known analytic landmark, so this is a real check on the sweep
    // rather than a self-consistency one.
    const betas = Array.from({ length: 400 }, (_, i) => 0.05 + i * 0.02);
    const sweep = heatCapacitySweep([0, 1], betas);
    if (sweep.kind !== "value") throw new Error(sweep.reason);
    expect(sweep.peakBeta).toBeGreaterThan(2.2);
    expect(sweep.peakBeta).toBeLessThan(2.6);
  });

  it("declines a degenerate sweep", () => {
    expect(heatCapacitySweep([1], [0, 1]).kind).toBe("unavailable");
    expect(heatCapacitySweep(LEVELS, []).kind).toBe("unavailable");
  });
});
