// src/types/wallet/index.ts
import type { TokenSymbol } from "../common";

/** 내부 호환성을 위해 남겨둔 alias */
export type TokenCode = TokenSymbol;

/** 트랜잭션 뷰 타입(영문 레이블) */
export type TxType = "DEPOSIT" | "WITHDRAW";
export type TxStatus = "COMPLETED" | "PENDING" | "FAILED";

/** 히스토리 아이템(프론트 표시용) */
export type Tx = {
  id: string;
  type: TxType;
  token: TokenSymbol;
  amount: number;
  date: string; // "YYYY-MM-DD HH:mm"
  status: TxStatus;
};

/** 보유 잔고 */
export type WalletBalances = Record<TokenSymbol, number>;

/** 공용 커서 타입 */
export type Cursor = { ts?: string | null; id?: string | null } | null;

/* -----------------------------------------------------------------------------
 * /api/wallet
 * ---------------------------------------------------------------------------*/

export type WalletErrCode = "UNAUTHORIZED" | "UNKNOWN";

/** 백엔드 응답: ok:true */
export type WalletApiOk = {
  ok: true;
  balances: Partial<Record<TokenSymbol, number>>;
  /** 필요 시 프론트에서 사용할 수 있도록 옵션 필드 유지 */
  wallet?: {
    depositAddress: string | null;
    withdrawAddress: string | null;
  };
  message?: string;
};

/** 백엔드 응답: ok:false */
export type WalletApiErr = {
  ok: false;
  code?: WalletErrCode;
  message?: string;
};

export type WalletApi = WalletApiOk | WalletApiErr;
export type WalletResponse = WalletApi;

/* -----------------------------------------------------------------------------
 * /api/coin/prices
 * ---------------------------------------------------------------------------*/

export type PricesErrCode = "UNAUTHORIZED" | "BAD_REQUEST" | "UNKNOWN";

export interface PricesOk {
  prices: Partial<
    Record<TokenSymbol, Partial<{ price: number; withdrawFee: number }>>
  >;
}

export type PricesResponse =
  | ({ ok: true } & PricesOk)
  | { ok: false; code?: PricesErrCode; message?: string };

/* -----------------------------------------------------------------------------
 * /api/wallet/deposit
 * ---------------------------------------------------------------------------*/

export type DepositNetwork = "BEP-20";

export type DepositErrCode = "UNAUTHORIZED" | "UPSTREAM_TIMEOUT" | "UNKNOWN";

/** 백엔드 ok:true 스키마 */
export interface DepositResponseOk {
  ok: true;
  depositAddress: string; // EIP-55 checksum
  provisioned: boolean; // true when ensured
  message?: string;
}

/** 백엔드 ok:false 스키마 */
export interface DepositResponseErr {
  ok: false;
  code?: DepositErrCode;
  message?: string;
}

export type DepositResponse = DepositResponseOk | DepositResponseErr;

/** (과거 호환용) Raw 타입 */
export interface RawDepositApiSuccess {
  ok: true;
  depositAddress: string;
  message?: string;
}
export interface RawDepositApiError {
  ok: false;
  message?: string;
}

// 입금 주소 훅(useDepositAddress)에서 사용하는 프레젠테이션용 payload
export interface DepositAddressPayload {
  depositAddress: string;
  network: DepositNetwork; // 예: "BEP-20"
}

/* -----------------------------------------------------------------------------
 * /api/wallet/history
 * ---------------------------------------------------------------------------*/

export type HistoryApiOk = {
  ok: true;
  items: Tx[];
  nextCursor: Cursor;
  message?: string;
};

export type HistoryApiErr = { ok: false; message?: string };

export type HistoryApi = HistoryApiOk | HistoryApiErr;

/* -----------------------------------------------------------------------------
 * /api/wallet/withdraw
 * ---------------------------------------------------------------------------*/

export interface WithdrawRequest {
  token: TokenSymbol;
  amount: number;
}

export interface WithdrawOk {
  /** 선택적으로 최신 잔고 내려올 수 있음 */
  balances?: Partial<Record<TokenSymbol, number>>;
}

export type WithdrawErrCode =
  | "NO_WITHDRAW_ADDRESS"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_AMOUNT"
  | "INVALID_TOKEN"
  | "UNAUTHORIZED"
  | "UNKNOWN";

export type WithdrawResponse =
  | ({ ok: true } & WithdrawOk)
  | { ok: false; code?: WithdrawErrCode; message?: string };

export type OkBody = {
  ok: true;
  tx: {
    id: string;
    tokenCode: string;
    txType: string; // ← 문자열로 정규화
    amount: string; // ← Decimal → string
    status: string; // ← 문자열로 정규화
    memo: string | null;
    txHash: string | null;
    logIndex: number | null;
    blockNumber: string | null; // ← bigint → string (JSON 안전)
    fromAddress: string | null;
    toAddress: string | null;
    createdAt: string; // ← ISO 문자열로 직렬화 (Date 직렬화 일관성)
  };
  balances: { USDT: number; QAI: number; DFT: number };
};

export type ErrBody = { ok: false; code: WithdrawErrCode; message?: string };

/* -----------------------------------------------------------------------------
 * 기타 상수 (필요 시 사용, 미사용이면 삭제해도 무방)
 * ---------------------------------------------------------------------------*/

/** 프론트 임시 상수(실제 가격은 /api/coin/prices 사용 권장) */
export const DFT_PRICE_USDT: number = 0.75;
