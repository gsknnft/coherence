export type LorentzBarrierResult = {
  gamma: number;
  ratio: number;
  boundExceeded: boolean;
  pointOfNoReturn: boolean;
  clipped: boolean;
  returnVelocity: number;
};

export const DEFAULT_MAX_GAMMA = 64;
export const DEFAULT_POINT_OF_NO_RETURN_RATIO = 1.2;

export function lorentzGamma(
  v: number,
  c: number,
  eps = 1e-6,
  maxGamma = DEFAULT_MAX_GAMMA,
): number {
  const denom = Math.max(c, eps);
  const ratioRaw = Math.abs(v) / denom;
  if (!Number.isFinite(ratioRaw)) return maxGamma;
  if (ratioRaw >= 1) return maxGamma;
  const r = Math.min(ratioRaw, 1 - eps);
  const gamma = 1 / Math.sqrt(Math.max(eps, 1 - r * r));
  return Math.min(maxGamma, gamma);
}

export function evaluateLorentzBarrier(
  driftRateValue: number,
  bound: number,
  eps = 1e-6,
  maxGamma = DEFAULT_MAX_GAMMA,
  pointOfNoReturnRatio = DEFAULT_POINT_OF_NO_RETURN_RATIO,
): LorentzBarrierResult {
  const safeBound = Math.max(bound, eps);
  const safePnrRatio = Math.max(1, pointOfNoReturnRatio);
  const returnVelocity = safeBound * safePnrRatio;
  const ratioRaw = Math.abs(driftRateValue) / safeBound;
  const boundExceeded = ratioRaw >= 1;
  const pointOfNoReturn = ratioRaw >= safePnrRatio;
  const clipped = ratioRaw > 1 - eps || pointOfNoReturn;
  const ratio = Math.min(ratioRaw, 1 - eps);
  const gamma = lorentzGamma(driftRateValue, safeBound, eps, maxGamma);

  return {
    gamma,
    ratio,
    boundExceeded,
    pointOfNoReturn,
    clipped: clipped || gamma >= maxGamma,
    returnVelocity,
  };
}
