// src/guards/admin/packages-history.ts
import type {
  PackageHistoryListResponse,
  PackageHistoryRow,
} from "@/types/admin/packages/history";

function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null;
}

export function isHistoryRow(u: unknown): u is PackageHistoryRow {
  if (!isRecord(u)) return false;
  return (
    typeof u.id === "string" &&
    typeof u.createdAt === "string" &&
    typeof u.username === "string" &&
    typeof u.packageName === "string" &&
    typeof u.quantity === "number" &&
    typeof u.unitPrice === "string" &&
    typeof u.totalPrice === "string"
  );
}

export function isHistoryList(u: unknown): u is PackageHistoryListResponse {
  if (!isRecord(u)) return false;
  if (
    !(
      typeof u.page === "number" &&
      typeof u.pageSize === "number" &&
      typeof u.total === "number"
    )
  )
    return false;
  if (!Array.isArray(u.items)) return false;
  return u.items.every(isHistoryRow);
}
