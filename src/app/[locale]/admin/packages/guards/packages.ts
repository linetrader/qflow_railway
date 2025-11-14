import type {
  PackageRow,
  ListResp,
  PackageDetail,
  DetailResp,
  CreateResp,
} from "@/types/admin/packages";

function isStr(u: unknown): u is string {
  return typeof u === "string";
}
function isNum(u: unknown): u is number {
  return typeof u === "number" && Number.isFinite(u);
}
function isRec(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null;
}

export function isPackageRow(u: unknown): u is PackageRow {
  if (!isRec(u)) return false;
  return (
    isStr(u.id) && isStr(u.name) && isStr(u.price) && isStr(u.dailyDftAmount)
  );
}

export function isListResp(u: unknown): u is ListResp {
  if (!isRec(u)) return false;
  const page = (u as { page?: unknown }).page;
  const size = (u as { size?: unknown }).size;
  const total = (u as { total?: unknown }).total;
  const items = (u as { items?: unknown }).items;
  return (
    isNum(page) &&
    isNum(size) &&
    isNum(total) &&
    Array.isArray(items) &&
    items.every(isPackageRow)
  );
}

export function isPackageDetail(u: unknown): u is PackageDetail {
  return isPackageRow(u);
}

export function isDetailResp(u: unknown): u is DetailResp {
  if (!isRec(u)) return false;
  return isPackageDetail((u as { item?: unknown }).item);
}

export function isCreateResp(u: unknown): u is CreateResp {
  if (!isRec(u)) return false;
  const item = (u as { item?: unknown }).item;
  return isPackageDetail(item);
}
