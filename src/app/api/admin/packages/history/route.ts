// src/app/api/admin/packages/history/route.ts
import { NextResponse } from "next/server";
import { listPackageHistory } from "./history-query";
import type {
  PackageHistoryFilters,
  PackageHistorySort,
  PageParams,
} from "@/types/admin/packages/history";

export const runtime = "nodejs";

function toInt(v: string | null, d?: number) {
  if (v == null) return d;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : d;
}
function toStr(v: string | null) {
  if (v == null) return undefined;
  const s = v.trim();
  return s !== "" ? s : undefined;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    const filters: PackageHistoryFilters = {
      username: toStr(sp.get("username")),
      packageId: toStr(sp.get("packageId")),
      packageNameContains: toStr(sp.get("packageNameContains")),
      quantityMin: toInt(sp.get("quantityMin")),
      quantityMax: toInt(sp.get("quantityMax")),
      // Decimal 범위: 문자열 그대로 위임 (history-query에서 Prisma.Decimal로 안전 파싱)
      unitPriceMin: toStr(sp.get("unitPriceMin")),
      unitPriceMax: toStr(sp.get("unitPriceMax")),
      totalPriceMin: toStr(sp.get("totalPriceMin")),
      totalPriceMax: toStr(sp.get("totalPriceMax")),
      // 날짜 문자열 그대로 위임 (history-query에서 Date로 안전 파싱)
      createdFrom: toStr(sp.get("createdFrom")),
      createdTo: toStr(sp.get("createdTo")),
    };

    const key = sp.get("sortKey") as PackageHistorySort["key"] | null;
    const order = sp.get("sortOrder") as PackageHistorySort["order"] | null;
    const sort: PackageHistorySort | undefined =
      key && order ? { key, order } : undefined;

    const page: PageParams = {
      page: Math.max(1, toInt(sp.get("page"), 1)!),
      pageSize: Math.min(200, Math.max(1, toInt(sp.get("pageSize"), 20)!)),
    };

    const data = await listPackageHistory(filters, page, sort);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", errorMessage: message },
      { status: 500 }
    );
  }
}
