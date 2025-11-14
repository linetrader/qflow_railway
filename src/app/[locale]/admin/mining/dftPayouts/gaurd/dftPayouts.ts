import type {
  ApiResponse,
  DftPayoutRow,
  DftPayoutsPayload,
  DftPayoutsMeta,
} from "../types/dftPayouts";

const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isNullableString = (v: unknown): v is string | null =>
  v === null || typeof v === "string";

export const isDftPayoutRow = (o: unknown): o is DftPayoutRow => {
  if (typeof o !== "object" || o === null) return false;
  const r = o as Record<string, unknown>;
  const usernameOk = r.username === undefined || isString(r.username);
  return (
    isString(r.id) &&
    isString(r.userId) &&
    isString(r.name) &&
    isNumber(r.amountDFT) &&
    isNullableString(r.note) &&
    (r.miningPayoutId === null || isString(r.miningPayoutId)) &&
    isString(r.createdAt) &&
    usernameOk
  );
};

export const isDftPayoutsPayload = (o: unknown): o is DftPayoutsPayload => {
  if (typeof o !== "object" || o === null) return false;
  const r = o as Record<string, unknown>;
  if (!Array.isArray(r.items)) return false;
  return r.items.every(isDftPayoutRow);
};

export const isMeta = (o: unknown): o is DftPayoutsMeta => {
  if (typeof o !== "object" || o === null) return false;
  const r = o as Record<string, unknown>;
  return (
    isNumber(r.page) &&
    isNumber(r.pageSize) &&
    isNumber(r.total) &&
    isNumber(r.sumAmountDFT) // ← 총합 필수 확인
  );
};

export const isApiOk = <T>(
  o: unknown,
  payloadGuard: (p: unknown) => p is T
): o is ApiResponse<T> => {
  if (typeof o !== "object" || o === null) return false;
  const r = o as Record<string, unknown>;
  if (r.ok === true) {
    return payloadGuard(r.data) && (r.meta === undefined || isMeta(r.meta));
  }
  if (r.ok === false) {
    const codeOk =
      r.code === "UNAUTHORIZED" ||
      r.code === "INVALID_PARAM" ||
      r.code === "INTERNAL";
    return codeOk && (r.message === undefined || isString(r.message));
  }
  return false;
};
