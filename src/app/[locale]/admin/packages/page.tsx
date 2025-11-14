// src/app/admin/packages/page.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQS } from "@/app/[locale]/admin/lib/useQS";
import { useDebouncedValue } from "@/app/[locale]/admin/lib/useDebouncedValue";
import { usePackagesList } from "./hooks/usePackagesList";
import PackagesTable from "./view/PackagesTable";

export default function PackageListPage() {
  const { searchParams, setParams } = useQS();

  const page = useMemo(
    () => Math.max(1, Number(searchParams?.get("page") ?? 1)),
    [searchParams]
  );

  const size = useMemo(() => {
    const n = Number(searchParams?.get("size") ?? 20);
    return [10, 20, 50, 100, 200].includes(n) ? n : 20;
  }, [searchParams]);

  const q = searchParams?.get("q") ?? "";
  const qDebounced = useDebouncedValue(q, 400);

  const { data, items, loading, error } = usePackagesList({
    page,
    size,
    q: qDebounced,
  });

  return (
    <main className="p-4 md:p-6 space-y-4">
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">패키지 목록</h1>
          <p className="text-sm opacity-70">총 {data?.total ?? 0}건</p>
        </div>
        <Link href="/admin/packages/form" className="btn btn-outline btn-sm">
          신규 등록
        </Link>
      </div>

      <section className="space-y-3">
        <h3 className="font-semibold">검색</h3>
        <div className="card p-4">
          <div className="flex items-end gap-2">
            <label className="form-control w-full max-w-md">
              <span className="label-text">패키지명 검색</span>
              <input
                type="text"
                className="input input-bordered"
                placeholder="예) Starter"
                defaultValue={q}
                onChange={(e) =>
                  setParams({ q: e.currentTarget.value, page: 1 })
                }
              />
            </label>
            {q ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setParams({ q: "", page: 1 })}
              >
                검색 초기화
              </button>
            ) : null}
          </div>
        </div>
      </section>

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

      {data && (
        <PackagesTable
          items={items}
          page={page}
          size={data.size}
          total={data.total}
          onPageChange={(next) => setParams({ page: next })}
          onSizeChange={(next) => setParams({ size: next, page: 1 })}
        />
      )}
    </main>
  );
}
