// src/app/admin/wallets/worker/types/index.ts

export type ChainRow = {
  id: string;
  rpcUrl: string;
  usdtAddress: string;
  dftAddress: string | null | undefined;
  confirmations: number;
  scanBatch: number;
  bnbMinForSweep: string; // Decimal 문자열
  isEnabled: boolean;
  balanceConcurrency: number;
  balanceLogEveryN: number;
  sweepIfUsdtGtZero: boolean;
};

export type WorkerStatus = {
  balanceEnabled: boolean;
  sweepEnabled: boolean;
  balanceLastRunAt: string | null;
  sweepLastRunAt: string | null;
  pendingBalanceKick: boolean;
  pendingSweepKick: boolean;
};

export type AllowedKey = "BSC_MAINNET" | "BSC_TESTNET";

export type ActiveKV = { key: AllowedKey; value: string; updatedAt: string };

export type LoadKvResp =
  | { ok: true; allowed: AllowedKey[]; active: ActiveKV }
  | { ok: false; message?: string; code?: string };

export type SaveKvResp =
  | { ok: true; active: ActiveKV }
  | { ok: false; message?: string; code?: string };

export type CfgResp =
  | { ok: true; rows: ChainRow[] }
  | { ok: false; message?: string; code?: string };

export type StResp =
  | { ok: true; status: WorkerStatus }
  | { ok: false; message?: string; code?: string };

export type SaveChainResp =
  | { ok: true; row: ChainRow }
  | { ok: false; message?: string; code?: string };

export type PatchResp =
  | { ok: true }
  | { ok: false; message?: string; code?: string };
