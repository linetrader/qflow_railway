import type {
  BulkPurchaseDry,
  BulkPurchaseRun,
  BulkPurchaseResult,
  PackagesApiResp,
  PackageBrief,
  BulkItem,
} from "@/types/admin/packages/user/packages-bulk";

function isRec(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null;
}
function isStr(u: unknown): u is string {
  return typeof u === "string";
}
function isBool(u: unknown): u is boolean {
  return typeof u === "boolean";
}
function isNum(u: unknown): u is number {
  return typeof u === "number" && Number.isFinite(u);
}

export function isPackageBrief(u: unknown): u is PackageBrief {
  if (!isRec(u)) return false;
  return isStr(u.id) && isStr(u.name);
}
export function isPackagesApiResp(u: unknown): u is PackagesApiResp {
  if (!isRec(u)) return false;
  const items = (u as { items?: unknown }).items;
  return Array.isArray(items) && items.every(isPackageBrief);
}

export function isBulkItem(u: unknown): u is BulkItem {
  if (!isRec(u)) return false;
  const o = u as Record<string, unknown>;
  return isStr(o.packageId) && isNum(o.units);
}

export function isBulkPurchaseDry(u: unknown): u is BulkPurchaseDry {
  if (!isRec(u)) return false;
  const o = u as Record<string, unknown>;
  return o.dry === true && Array.isArray(o.targets) && isNum(o.count);
}

export function isBulkPurchaseRun(u: unknown): u is BulkPurchaseRun {
  if (!isRec(u)) return false;
  const o = u as Record<string, unknown>;
  const items = o.items;
  const okItems =
    Array.isArray(items) &&
    items.every((r) => {
      if (!isRec(r)) return false;
      const rr = r as Record<string, unknown>;
      const msgOk = rr.message === undefined || isStr(rr.message);
      const totalOk = rr.totalUSD === undefined || isStr(rr.totalUSD);
      return isStr(rr.username) && isBool(rr.ok) && msgOk && totalOk;
    });
  return okItems && isNum(o.total) && isNum(o.success) && isNum(o.fail);
}

export function isBulkPurchaseResult(u: unknown): u is BulkPurchaseResult {
  return isBulkPurchaseDry(u) || isBulkPurchaseRun(u);
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
