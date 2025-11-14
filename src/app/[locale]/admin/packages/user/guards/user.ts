// src/app/admin/packages/user/guards/user.ts
import type {
  UserPackageListResponse,
  UserPackageRow,
} from "@/types/admin/packages/user";

function isRec(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null;
}
function isStr(u: unknown): u is string {
  return typeof u === "string";
}
function isNum(u: unknown): u is number {
  return typeof u === "number" && Number.isFinite(u);
}

export function isUserPackageRow(u: unknown): u is UserPackageRow {
  if (!isRec(u)) return false;
  const o = u as Record<string, unknown>;
  const countryOk = o.countryCode === null || isStr(o.countryCode);
  const qtyOk = isNum(o.quantity) || isStr(o.quantity);
  return (
    isStr(o.username) &&
    isNum(o.level) &&
    countryOk &&
    isStr(o.packageId) &&
    isStr(o.packageName) &&
    qtyOk &&
    isStr(o.createdAt) &&
    isStr(o.updatedAt)
  );
}

export function isUserPackageListResponse(
  u: unknown
): u is UserPackageListResponse {
  if (!isRec(u)) return false;
  const o = u as Record<string, unknown>;
  const items = o.items;
  return (
    isNum(o.total) && Array.isArray(items) && items.every(isUserPackageRow)
  );
}

export function isAbortError(e: unknown): boolean {
  if (typeof DOMException !== "undefined" && e instanceof DOMException) {
    return e.name === "AbortError";
  }
  if (e && typeof e === "object" && "name" in e) {
    const n = (e as { name?: unknown }).name;
    return n === "AbortError";
  }
  return false;
}
