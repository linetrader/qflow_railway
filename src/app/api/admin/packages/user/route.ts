// app/api/admin/packages/user/route.ts
import { NextResponse } from "next/server";
import { listUserPackages } from "./user-query";
import type {
  UserPackageFilters,
  UserPackageSort,
  PageParams,
  UserPackageListResponse,
} from "@/types/admin/packages/user";

export const runtime = "nodejs";

function toInt(v: string | null, d?: number) {
  if (v == null) return d;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : d;
}
function toStr(v: string | null) {
  return v != null && v !== "" ? v : undefined;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    const filters: UserPackageFilters = {
      username: toStr(sp.get("username")),
      countryCode: toStr(sp.get("countryCode"))?.toUpperCase(),
      levelMin: toInt(sp.get("levelMin")),
      levelMax: toInt(sp.get("levelMax")),
      packageId: toStr(sp.get("packageId")),
      packageNameContains: toStr(sp.get("packageNameContains")),
      createdFrom: toStr(sp.get("createdFrom")),
      createdTo: toStr(sp.get("createdTo")),
    };

    const key = sp.get("sortKey") as UserPackageSort["key"] | null;
    const order = sp.get("sortOrder") as UserPackageSort["order"] | null;
    const sort: UserPackageSort | undefined =
      key && order ? { key, order } : undefined;

    const page: PageParams = {
      page: Math.max(1, toInt(sp.get("page"), 1)!),
      pageSize: Math.min(200, Math.max(1, toInt(sp.get("pageSize"), 20)!)),
    };

    // listUserPackages가 이미 엄격 타입(UserPackageListResponse)을 반환
    const data: UserPackageListResponse = await listUserPackages(
      filters,
      page,
      sort
    );

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", errorMessage: message },
      { status: 500 }
    );
  }
}
