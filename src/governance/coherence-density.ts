export type SpectralSequence = ArrayLike<number> | ArrayLike<readonly number[]>;

export interface SpectralNegentropyOptions {
  removeMean?: boolean;
  topK?: number;
  epsilon?: number;
}

export interface SpectralNegentropyChannel {
  concentration: number;
  entropy: number;
  normalizedEntropy: number;
  ratio: number;
  score: number;
  bins: number;
}

export interface SpectralNegentropyResult {
  score: number;
  ratio: number;
  concentration: number;
  entropy: number;
  normalizedEntropy: number;
  sampleCount: number;
  channels: SpectralNegentropyChannel[];
}

const EPS = 1e-9;

export function computeSpectralNegentropyIndex(
  input: SpectralSequence,
  options: SpectralNegentropyOptions = {},
): SpectralNegentropyResult {
  const channels = toChannels(input);
  if (!channels.length) {
    return {
      score: 0,
      ratio: 0,
      concentration: 0,
      entropy: 0,
      normalizedEntropy: 1,
      sampleCount: 0,
      channels: [],
    };
  }

  const topK = Math.max(1, Math.floor(options.topK ?? 1));
  const removeMean = options.removeMean !== false;
  const epsilon = Math.max(EPS, options.epsilon ?? EPS);
  const channelMetrics = channels.map((channel) =>
    computeChannelMetric(channel, { topK, removeMean, epsilon }),
  );

  return {
    score: mean(channelMetrics.map((m) => m.score)),
    ratio: mean(channelMetrics.map((m) => m.ratio)),
    concentration: mean(channelMetrics.map((m) => m.concentration)),
    entropy: mean(channelMetrics.map((m) => m.entropy)),
    normalizedEntropy: mean(channelMetrics.map((m) => m.normalizedEntropy)),
    sampleCount: channels[0]?.length ?? 0,
    channels: channelMetrics,
  };
}

export function spectralNegentropyDelta(
  previous: SpectralNegentropyResult | null | undefined,
  current: SpectralNegentropyResult | null | undefined,
): number {
  if (!previous || !current) return 0;
  return current.score - previous.score;
}

function computeChannelMetric(
  channel: number[],
  options: Required<Pick<SpectralNegentropyOptions, "topK" | "removeMean" | "epsilon">>,
): SpectralNegentropyChannel {
  const normalized = normalizeChannel(channel, options.removeMean);
  const powers = periodogram(normalized);
  const totalPower = powers.reduce((sum, value) => sum + value, 0);

  if (!Number.isFinite(totalPower) || totalPower <= options.epsilon) {
    return {
      concentration: 1,
      entropy: 0,
      normalizedEntropy: 0,
      ratio: 1 / options.epsilon,
      score: 1,
      bins: powers.length,
    };
  }

  const sorted = [...powers].sort((a, b) => b - a);
  const concentration =
    sorted.slice(0, Math.min(options.topK, sorted.length)).reduce((sum, value) => sum + value, 0) /
    totalPower;

  const probs = powers.map((value) => value / totalPower);
  const entropy = -probs.reduce((sum, p) => sum + p * Math.log(Math.max(options.epsilon, p)), 0);
  const maxEntropy = Math.log(Math.max(2, probs.length));
  const normalizedEntropy = maxEntropy > options.epsilon ? entropy / maxEntropy : 0;
  const ratio = concentration / Math.max(options.epsilon, normalizedEntropy);
  const score = clamp01(concentration * (1 - normalizedEntropy));

  return {
    concentration,
    entropy,
    normalizedEntropy,
    ratio,
    score,
    bins: powers.length,
  };
}

function toChannels(input: SpectralSequence): number[][] {
  const list = Array.from(input as ArrayLike<number | readonly number[]>);
  if (!list.length) return [];

  if (typeof list[0] === "number") {
    return [list.map((value) => Number(value ?? 0))];
  }

  const tuples = list as readonly (readonly number[])[];
  const width = Math.max(0, ...tuples.map((row) => row.length));
  const channels = Array.from({ length: width }, () => [] as number[]);

  for (const row of tuples) {
    for (let i = 0; i < width; i += 1) {
      channels[i].push(Number(row[i] ?? 0));
    }
  }
  return channels.filter((channel) => channel.length > 0);
}

function normalizeChannel(channel: number[], removeMean: boolean): number[] {
  if (!channel.length) return [];
  const mu = removeMean ? mean(channel) : 0;
  const centered = channel.map((value) => value - mu);
  const sigma = stddev(centered);
  if (sigma <= EPS) return centered;
  return centered.map((value) => value / sigma);
}

function periodogram(samples: number[]): number[] {
  const n = samples.length;
  if (n < 2) return [0];
  const bins = Math.max(1, Math.floor(n / 2));
  const out: number[] = [];
  for (let k = 1; k <= bins; k += 1) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i += 1) {
      const angle = (2 * Math.PI * k * i) / n;
      re += samples[i] * Math.cos(angle);
      im -= samples[i] * Math.sin(angle);
    }
    out.push(re * re + im * im);
  }
  return out;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mu = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mu) * (value - mu), 0) /
    Math.max(1, values.length - 1);
  return Math.sqrt(variance);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
