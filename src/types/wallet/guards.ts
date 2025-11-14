// src/types/wallet/guards.ts
import type {
  WalletBalances,
  WalletApi,
  PricesResponse,
  WithdrawResponse,
  DepositResponse,
  HistoryApi,
  HistoryApiOk,
  Tx,
} from "@/types/wallet";
import type { TokenSymbol } from "../common";

/* ----------------------------------------------------------------------------- */
/* 기본 형태 가드 */
/* ----------------------------------------------------------------------------- */

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isString(x: unknown): x is string {
  return typeof x === "string";
}
function isNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function isBoolean(x: unknown): x is boolean {
  return typeof x === "boolean";
}
function hasOwn<T extends string>(
  o: Record<string, unknown>,
  k: T
): o is Record<T, unknown> {
  return Object.prototype.hasOwnProperty.call(o, k);
}

/* ----------------------------------------------------------------------------- */
/* 공통 유틸 */
/* ----------------------------------------------------------------------------- */

const TOKENS: ReadonlyArray<TokenSymbol> = ["USDT", "QAI", "DFT"] as const;

function isTokenSymbol(x: unknown): x is TokenSymbol {
  return isString(x) && (TOKENS as ReadonlyArray<string>).includes(x);
}

/* ----------------------------------------------------------------------------- */
/* 구조 가드 */
/* ----------------------------------------------------------------------------- */

export function isWalletBalances(x: unknown): x is WalletBalances {
  if (!isRecord(x)) return false;
  const u = x as Record<string, unknown>;
  // 모든 토큰 키가 존재하고 모두 number 여야 WalletBalances로 간주
  return isNumber(u.USDT) && isNumber(u.QAI) && isNumber(u.DFT);
}

export function isWalletApi(x: unknown): x is WalletApi {
  if (!isRecord(x) || !hasOwn(x, "ok") || !isBoolean(x.ok)) return false;

  if (x.ok === true) {
    const balances = (x as Record<string, unknown>).balances;
    if (!isRecord(balances)) return false;

    // balances는 Partial<Record<TokenSymbol, number>> 이므로
    // 존재하는 키만 number 여부 확인 (백엔드가 항상 3개 모두 주면 통과)
    for (const k of TOKENS) {
      const v = balances[k];
      if (v !== undefined && !isNumber(v)) return false;
    }
    return true;
  }
  // ok:false 는 코드/메시지 유무만으로 통과
  return true;
}

/** /api/coin/prices 응답 가드 */
export function isPricesResponse(x: unknown): x is PricesResponse {
  if (!isRecord(x) || !isBoolean(x.ok)) return false;
  if (x.ok === false) return true;

  const prices = (x as Record<string, unknown>).prices;
  if (!isRecord(prices)) return false;

  for (const key of Object.keys(prices)) {
    if (!isTokenSymbol(key)) continue; // 허용된 키만 검사
    const row = (prices as Record<string, unknown>)[key];
    if (row == null) continue;
    if (!isRecord(row)) return false;

    const pr = (row as Record<string, unknown>).price;
    const fee = (row as Record<string, unknown>).withdrawFee;

    if (pr !== undefined && !isNumber(pr)) return false;
    if (fee !== undefined && !isNumber(fee)) return false;
  }
  return true;
}

/** /api/wallet/deposit 응답 가드 */
export function isDepositResponse(x: unknown): x is DepositResponse {
  if (!isRecord(x) || !isBoolean(x.ok)) return false;
  if (x.ok === false) return true;

  const o = x as Record<string, unknown>;
  return isString(o.depositAddress) && typeof o.provisioned === "boolean";
}

/** /api/wallet/withdraw 응답 가드 */
export function isWithdrawResponse(x: unknown): x is WithdrawResponse {
  if (!isRecord(x) || !isBoolean(x.ok)) return false;
  if (x.ok === false) return true;

  const b = (x as Record<string, unknown>).balances;
  if (b === undefined) return true;
  if (!isRecord(b)) return false;

  for (const k of TOKENS) {
    const v = b[k];
    if (v !== undefined && !isNumber(v)) return false;
  }
  return true;
}

/** /api/wallet/history 응답 가드 */
export function isHistoryApi(x: unknown): x is HistoryApi {
  if (!isRecord(x) || !isBoolean(x.ok)) return false;
  if (x.ok === false) return true;

  const o = x as HistoryApiOk;
  const items = (o as Record<string, unknown>).items;
  const nextCursor = (o as Record<string, unknown>).nextCursor;

  const ncValid =
    nextCursor === null ||
    (isRecord(nextCursor) &&
      (nextCursor.ts === null ||
        nextCursor.ts === undefined ||
        isString(nextCursor.ts)) &&
      (nextCursor.id === null ||
        nextCursor.id === undefined ||
        isString(nextCursor.id)));

  return Array.isArray(items) && ncValid;
}

/* ----------------------------------------------------------------------------- */
/* 단일 아이템 가드 / 메시지 픽커 */
/* ----------------------------------------------------------------------------- */

export function pickMessage(x: unknown): string | undefined {
  if (!isRecord(x)) return undefined;
  const v = (x as Record<string, unknown>).message;
  return typeof v === "string" ? v : undefined;
}

export function isTxArrayItem(t: unknown): t is Tx {
  if (!isRecord(t)) return false;
  const o = t as Record<string, unknown>;
  const typeOk = o.type === "DEPOSIT" || o.type === "WITHDRAW";
  const tokenOk = o.token === "USDT" || o.token === "QAI" || o.token === "DFT";
  const statusOk =
    o.status === "COMPLETED" || o.status === "PENDING" || o.status === "FAILED";

  return (
    isString(o.id) &&
    typeOk &&
    tokenOk &&
    isNumber(o.amount) &&
    isString(o.date) &&
    statusOk
  );
}
