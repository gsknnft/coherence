// Structural adapter/runtime contracts for packages that must remain chain-agnostic.

export type Cluster = string;

export interface PublicKeyLike {
  toBase58?: () => string;
  toString: () => string;
}
export type PublicKey = string | PublicKeyLike;

export interface RpcClientLike {
  [key: string]: unknown;
}
export type Connection = RpcClientLike;

export interface KeypairLike {
  publicKey: PublicKey;
  secretKey?: Uint8Array;
}
export type Keypair = KeypairLike;

export interface ConfirmedSignatureInfoLike {
  signature: string;
  slot?: number;
  err?: unknown;
  memo?: string | null;
  blockTime?: number | null;
  confirmationStatus?: string | null;
}
export type ConfirmedSignatureInfo = ConfirmedSignatureInfoLike;

export type Address = string;
export type Hex = string;
export type Abi = unknown;

export interface Account {
  address?: string;
  [key: string]: unknown;
}

export interface Client {
  [key: string]: unknown;
}

export interface TokenLike {
  mint?: string | PublicKey;
  symbol?: string;
  decimals?: number;
  [key: string]: unknown;
}

export type SignalBeginArgs = {
  kind:
    | "decision"
    | "swap"
    | "policy"
    | "event"
    | "proof"
    | "model"
    | "code"
    | "data";
  channel: string;
  policy: string;
  manifest: string;
  meta?: Record<string, unknown>;
};

export type Signal<TEnvelope = unknown> = {
  beginDecision: (args: SignalBeginArgs) => Promise<TEnvelope>;
  commit: (env: TEnvelope, result: unknown) => Promise<void>;
  exec: {
    swapChunk: (
      routeId: string,
      size: number,
      expected: unknown,
    ) => Promise<unknown>;
  };
};

