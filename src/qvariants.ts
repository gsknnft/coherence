import { createRequire } from "node:module";

// Keep qvariants build-local: avoid cross-package source imports.
export type SignalVector = unknown;
export type QuantumFieldState = unknown;

type QuantumSignalSuiteInstance = {
  processAndLog(signal: number[]): Promise<{ signalAnalysis: SignalVector }>;
};

type QuantumSignalSuiteCtor = {
  new (src?: string): QuantumSignalSuiteInstance;
  runFullFieldAnalysis(signal: Float64Array): {
    imfs: any;
    hilbertData: any;
    entropy: number;
  };
  evaluateSignalVector(signal: any): QuantumFieldState;
};

const require = createRequire(import.meta.url);

let quantumSignalSuiteCtor: QuantumSignalSuiteCtor | null = null;

function getQuantumSignalSuite(): QuantumSignalSuiteCtor {
  if (quantumSignalSuiteCtor) {
    return quantumSignalSuiteCtor;
  }

  const mod = require("@sigilnet/qfield") as {
    QuantumSignalSuite?: QuantumSignalSuiteCtor;
    default?: { QuantumSignalSuite?: QuantumSignalSuiteCtor };
  };
  const ctor = mod.QuantumSignalSuite ?? mod.default?.QuantumSignalSuite;
  if (!ctor) {
    throw new Error(
      "@sigilnet/qfield did not expose QuantumSignalSuite through its require export",
    );
  }
  quantumSignalSuiteCtor = ctor;
  return ctor;
}

export async function processAndLogSignal(
  signal: number[],
): Promise<SignalVector> {
  const QuantumSignalSuite = getQuantumSignalSuite();
  const qss = new QuantumSignalSuite();
  const { signalAnalysis: vec } = await qss.processAndLog(signal);
  return vec;
}

export async function sigAnalysis(signal: number[]): Promise<{
  signalAnalysis: SignalVector;
  qfield: QuantumFieldState;
  imfs: any;
  hilbertData: any;
  entropy: number;
}> {
  const QuantumSignalSuite = getQuantumSignalSuite();
  const canonicalSignal = Float64Array.from(signal);
  const { imfs, hilbertData, entropy } =
    QuantumSignalSuite.runFullFieldAnalysis(canonicalSignal);
  const suite = new QuantumSignalSuite();
  const { signalAnalysis } = await suite.processAndLog(signal);
  const qfield = QuantumSignalSuite.evaluateSignalVector(canonicalSignal);
  return { signalAnalysis, qfield, imfs, hilbertData, entropy };
}
