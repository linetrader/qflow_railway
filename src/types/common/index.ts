// src/types/common

// 공용 API 응답 포맷
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr<C extends string = string> = {
  ok: false;
  code?: C;
  message?: string;
};
export type ApiResponse<T, C extends string = string> = ApiOk<T> | ApiErr<C>;

export type ToastVariant = "info" | "success" | "warning" | "error";

export type TokenSymbol = "USDT" | "QAI" | "DFT";

export interface PriceRow {
  /** USDT 기준 가격 */
  price: number;
  /** 출금 수수료(%) 0.5 => 0.5% */
  withdrawFee: number;
}

export type Prices = Record<TokenSymbol, PriceRow>;

export interface Balances {
  USDT: number;
  QAI: number;
  DFT: number;
}
