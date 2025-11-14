// src/app/admin/centers/guard/index.ts
import type {
  DeleteResult,
  ListCentersResponse,
  PostResult,
  SearchUsersResponse,
} from "../types/admin-centers";

export function isNonEmptyString(v: string): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function isValidPercentString(v: string): boolean {
  // 0~100, 소수 둘째자리까지 허용 (프론트 UX용)
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(v)) return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100;
}

export function coercePercentToNumber(v: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

// 응답 타입 가드 (필요 시 최소 확인)
export function isListCentersResponse(
  json: unknown
): json is ListCentersResponse {
  return Boolean(
    json &&
      typeof json === "object" &&
      "ok" in (json as Record<string, unknown>) &&
      (json as Record<string, unknown>).ok === true &&
      "data" in (json as Record<string, unknown>)
  );
}

export function isSearchUsersResponse(
  json: unknown
): json is SearchUsersResponse {
  if (!json || typeof json !== "object") return false;
  const j = json as Record<string, unknown>;
  if (!("ok" in j)) return false;
  return true; // 세부 구조는 사용부에서 안전 사용
}

export function isPostResult(json: unknown): json is PostResult {
  if (!json || typeof json !== "object") return false;
  const j = json as Record<string, unknown>;
  return "ok" in j;
}

export function isDeleteResult(json: unknown): json is DeleteResult {
  if (!json || typeof json !== "object") return false;
  const j = json as Record<string, unknown>;
  return "ok" in j;
}

// 날짜 표시 유틸
export function fmtDateTimeISO(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
export function fmtDateISO(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
