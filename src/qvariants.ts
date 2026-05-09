// Keep qvariants build-local: avoid cross-package source imports.
// Node.js-only functionality (@sigilnet/qfield is CJS/Node-only).
// Browser consumers receive graceful no-ops — no crash.
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

let _qfieldCtor: QuantumSignalSuiteCtor | null = null;
let _qfieldAttempted = false;

async function getQuantumSignalSuite(): Promise<QuantumSignalSuiteCtor> {
  if (_qfieldCtor) return _qfieldCtor;
  if (_qfieldAttempted) throw new Error("@sigilnet/qfield unavailable in this environment");
  _qfieldAttempted = true;
  let mod: { QuantumSignalSuite?: QuantumSignalSuiteCtor; default?: { QuantumSignalSuite?: QuantumSignalSuiteCtor } };
  try {
    mod = await import("@sigilnet/qfield") as typeof mod;
  } catch {
    throw new Error("@sigilnet/qfield is not available in this environment (browser or not installed)");
  }
  const ctor = mod.QuantumSignalSuite ?? mod.default?.QuantumSignalSuite;
  if (!ctor) {
    throw new Error("@sigilnet/qfield did not expose QuantumSignalSuite");
  }
  _qfieldCtor = ctor;
  return ctor;
}

export async function processAndLogSignal(
  signal: number[],
): Promise<SignalVector> {
  const QuantumSignalSuite = await getQuantumSignalSuite();
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
  const QuantumSignalSuite = await getQuantumSignalSuite();
  const canonicalSignal = Float64Array.from(signal);
  const { imfs, hilbertData, entropy } =
    QuantumSignalSuite.runFullFieldAnalysis(canonicalSignal);
  const suite = new QuantumSignalSuite();
  const { signalAnalysis } = await suite.processAndLog(signal);
  const qfield = QuantumSignalSuite.evaluateSignalVector(canonicalSignal);
  return { signalAnalysis, qfield, imfs, hilbertData, entropy };
}
