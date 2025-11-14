// src/app/admin/packages/user/page.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQS } from "@/app/[locale]/admin/lib/useQS";
import UserPackageFiltersView from "./view/UserPackageFiltersView";
import UserPackageTableView from "./view/UserPackageTableView";
import { useUserPackages } from "./hooks/useUserPackages";

function initialFromSearch(sp: URLSearchParams | null): {
  username: string;
  countryCode: string;
  levelMin: string;
  levelMax: string;
  packageId: string;
  packageNameContains: string;
  createdFrom: string;
  createdTo: string;
  pageSize: string;
} {
  const v = (k: string) => sp?.get(k) || "";
  return {
    username: v("username"),
    countryCode: v("countryCode"),
    levelMin: v("levelMin"),
    levelMax: v("levelMax"),
    packageId: v("packageId"),
    packageNameContains: v("packageNameContains"),
    createdFrom: v("createdFrom"),
    createdTo: v("createdTo"),
    pageSize: v("pageSize") || "20",
  };
}

export default function Page() {
  const { searchParams, setParams } = useQS();

  const page = useMemo(
    () => Math.max(1, Number(searchParams?.get("page") ?? 1)),
    [searchParams]
  );
  const pageSize = useMemo(() => {
    const n = Number(searchParams?.get("pageSize") ?? 20);
    return [10, 20, 50, 100, 200].includes(n) ? n : 20;
  }, [searchParams]);

  const qs = useMemo(() => searchParams?.toString() ?? "", [searchParams]);
  const apiUrl = useMemo(
    () => `/api/admin/packages/user${qs ? `?${qs}` : ""}`,
    [qs]
  );

  const { data, items, loading, error } = useUserPackages(apiUrl);
  const initial = useMemo(
    () => initialFromSearch(searchParams),
    [searchParams]
  );

  const handleSubmit = (formData: FormData) => {
    const patch: Record<string, string | number | null> = {};
    const take = (k: string) => {
      const val = String(formData.get(k) ?? "").trim();
      patch[k] = val || null;
    };
    [
      "username",
      "countryCode",
      "levelMin",
      "levelMax",
      "packageId",
      "packageNameContains",
      "createdFrom",
      "createdTo",
    ].forEach(take);
    const ps = String(formData.get("pageSize") ?? "").trim();
    patch.page = 1;
    patch.pageSize = ps ? Number(ps) : Number(initial.pageSize) || 20;
    setParams(patch);
  };

  const handleReset = () => {
    setParams({
      username: null,
      countryCode: null,
      levelMin: null,
      levelMax: null,
      packageId: null,
      packageNameContains: null,
      createdFrom: null,
      createdTo: null,
      page: 1,
      pageSize: Number(initial.pageSize) || 20,
    });
  };

  return (
    <main className="p-4 md:p-6 space-y-4">
      {/* 헤더 */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">패키지 유저 목록</h1>
          <p className="text-sm opacity-70">
            유저별 보유 패키지 현황을 조회합니다.
          </p>
        </div>
        <Link href="/admin/packages/user/bulk-purchase" className="btn btn-sm">
          테스트 유저 대량 구매
        </Link>
      </div>

      {/* 필터 */}
      <section className="space-y-2">
        <h3 className="font-semibold">검색</h3>
        <div className="card p-3">
          <UserPackageFiltersView
            initial={initial}
            onSubmit={handleSubmit}
            onReset={handleReset}
          />
        </div>
      </section>

      {/* 상태 */}
      {loading && (
        <div className="alert">
          <span>불러오는 중…</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* 표 + 내부 페이지네이션 */}
      {data && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-70">
              총 {data.total.toLocaleString()}건
            </span>
            {/* 페이지 크기 선택은 필터에서 제어 */}
          </div>

          <UserPackageTableView
            rows={items}
            page={page}
            pageSize={pageSize}
            total={data.total}
            onPageChange={(next) => setParams({ page: next })}
          />
        </>
      )}
    </main>
  );
}
