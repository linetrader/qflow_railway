// src/app/admin/packages/history/view/HistoryFiltersView.tsx
"use client";

import { useMemo } from "react";
import { useQS } from "@/app/[locale]/admin/lib/useQS";

type InitialFilters = {
  username: string;
  packageId: string;
  packageNameContains: string;
  quantityMin: string;
  quantityMax: string;
  unitPriceMin: string;
  unitPriceMax: string;
  totalPriceMin: string;
  totalPriceMax: string;
  createdFrom: string;
  createdTo: string;
  pageSize: string;
};

export default function HistoryFiltersView() {
  const { searchParams, setParams } = useQS();

  const initial = useMemo((): InitialFilters => {
    const v = (k: string): string => searchParams?.get(k) ?? "";
    return {
      username: v("username"),
      packageId: v("packageId"),
      packageNameContains: v("packageNameContains"),
      quantityMin: v("quantityMin"),
      quantityMax: v("quantityMax"),
      unitPriceMin: v("unitPriceMin"),
      unitPriceMax: v("unitPriceMax"),
      totalPriceMin: v("totalPriceMin"),
      totalPriceMax: v("totalPriceMax"),
      createdFrom: v("createdFrom"),
      createdTo: v("createdTo"),
      pageSize: v("pageSize") || "20",
    };
  }, [searchParams]);

  const onSubmit = (formData: FormData) => {
    const patch: Record<string, string | number | null> = {};
    const setIf = (k: string) => {
      const val = String(formData.get(k) ?? "").trim();
      patch[k] = val || null;
    };

    [
      "username",
      "packageId",
      "packageNameContains",
      "quantityMin",
      "quantityMax",
      "unitPriceMin",
      "unitPriceMax",
      "totalPriceMin",
      "totalPriceMax",
      "createdFrom",
      "createdTo",
    ].forEach(setIf);

    const psRaw = String(formData.get("pageSize") ?? "").trim();
    patch.page = "1";
    patch.pageSize = psRaw || initial.pageSize;

    setParams(patch);
  };

  const onReset = () =>
    setParams({
      username: null,
      packageId: null,
      packageNameContains: null,
      quantityMin: null,
      quantityMax: null,
      unitPriceMin: null,
      unitPriceMax: null,
      totalPriceMin: null,
      totalPriceMax: null,
      createdFrom: null,
      createdTo: null,
      page: 1,
      pageSize: Number(initial.pageSize) || 20,
    });

  return (
    <section className="w-full">
      <div className="card bg-base-100 border border-base-300 shadow">
        <div className="card-body p-4">
          <h2 className="card-title mb-2">필터</h2>

          <form
            action={onSubmit}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* 아이디 */}
            <label className="form-control w-full">
              <span className="label-text">아이디</span>
              <input
                className="input input-bordered w-full"
                name="username"
                placeholder="예) alice"
                defaultValue={initial.username}
                autoComplete="off"
              />
            </label>

            {/* 패키지 ID */}
            <label className="form-control w-full">
              <span className="label-text">패키지 ID</span>
              <input
                className="input input-bordered w-full"
                name="packageId"
                placeholder="예) pkg_123"
                defaultValue={initial.packageId}
                autoComplete="off"
              />
            </label>

            {/* 패키지명 포함 */}
            <label className="form-control w-full">
              <span className="label-text">패키지명 포함</span>
              <input
                className="input input-bordered w-full"
                name="packageNameContains"
                placeholder="예) Starter"
                defaultValue={initial.packageNameContains}
                autoComplete="off"
              />
            </label>

            {/* 수량 ≥ */}
            <label className="form-control w-full">
              <span className="label-text">수량 ≥</span>
              <input
                className="input input-bordered w-full"
                name="quantityMin"
                type="number"
                min={0}
                placeholder="예) 1"
                defaultValue={initial.quantityMin}
                inputMode="numeric"
              />
            </label>

            {/* 수량 ≤ */}
            <label className="form-control w-full">
              <span className="label-text">수량 ≤</span>
              <input
                className="input input-bordered w-full"
                name="quantityMax"
                type="number"
                min={0}
                placeholder="예) 100"
                defaultValue={initial.quantityMax}
                inputMode="numeric"
              />
            </label>

            {/* 단가 ≥ (문자열) */}
            <label className="form-control w-full">
              <span className="label-text">단가 ≥ (문자열)</span>
              <input
                className="input input-bordered w-full"
                name="unitPriceMin"
                placeholder="예) 0.1"
                defaultValue={initial.unitPriceMin}
                inputMode="decimal"
              />
            </label>

            {/* 단가 ≤ (문자열) */}
            <label className="form-control w-full">
              <span className="label-text">단가 ≤ (문자열)</span>
              <input
                className="input input-bordered w-full"
                name="unitPriceMax"
                placeholder="예) 10.0"
                defaultValue={initial.unitPriceMax}
                inputMode="decimal"
              />
            </label>

            {/* 총액 ≥ (문자열) */}
            <label className="form-control w-full">
              <span className="label-text">총액 ≥ (문자열)</span>
              <input
                className="input input-bordered w-full"
                name="totalPriceMin"
                placeholder="예) 10"
                defaultValue={initial.totalPriceMin}
                inputMode="decimal"
              />
            </label>

            {/* 총액 ≤ (문자열) */}
            <label className="form-control w-full">
              <span className="label-text">총액 ≤ (문자열)</span>
              <input
                className="input input-bordered w-full"
                name="totalPriceMax"
                placeholder="예) 1000"
                defaultValue={initial.totalPriceMax}
                inputMode="decimal"
              />
            </label>

            {/* 생성일 From */}
            <label className="form-control w-full">
              <span className="label-text">생성일 From</span>
              <input
                className="input input-bordered w-full"
                name="createdFrom"
                type="date"
                defaultValue={initial.createdFrom}
              />
            </label>

            {/* 생성일 To */}
            <label className="form-control w-full">
              <span className="label-text">생성일 To</span>
              <input
                className="input input-bordered w-full"
                name="createdTo"
                type="date"
                defaultValue={initial.createdTo}
              />
            </label>

            {/* 페이지 크기 */}
            <label className="form-control w-full">
              <select
                className="select select-bordered w-full"
                name="pageSize"
                defaultValue={initial.pageSize}
              >
                <option value="10">10개</option>
                <option value="20">20개</option>
                <option value="50">50개</option>
                <option value="100">100개</option>
                <option value="200">200개</option>
              </select>
            </label>

            {/* 액션 버튼 */}
            <div className="col-span-full flex gap-2 pt-1">
              <button type="submit" className="btn btn-primary">
                검색
              </button>
              <button
                type="button"
                className="btn btn-ghost border border-base-300"
                onClick={onReset}
              >
                초기화
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
