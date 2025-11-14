// src/components/ui/Navigation/Pagination.tsx
"use client";

import React from "react";

export type PageItem = number | "…";

export type PaginationProps = {
  /** 전체 항목 수 */
  total: number;
  /** 현재 페이지 (1-based) */
  page: number;
  /** 페이지 크기 */
  pageSize: number;
  /** 페이지 변경 핸들러 */
  onPageChange: (nextPage: number) => void;
  /** 페이지 크기 변경 핸들러 (옵션) */
  onPageSizeChange?: (nextSize: number) => void;
  /** 크기 선택 드롭다운 노출 여부 (기본 true: onPageSizeChange가 있으면 표시) */
  showPageSizeSelect?: boolean;
  /** 선택 가능 페이지 크기 목록 */
  pageSizeOptions?: readonly number[];
  /** 외부 컨테이너 className */
  className?: string;
};

export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelect,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const items = buildPageItems(page, totalPages);

  const showSelect =
    showPageSizeSelect ?? typeof onPageSizeChange === "function";

  return (
    <div
      className={`flex items-center justify-between gap-3 ${className ?? ""}`}
    >
      <div className="text-sm opacity-70 whitespace-nowrap">
        총 {total.toLocaleString()}건 · 페이지 {page} / {totalPages}
      </div>

      <div className="flex items-center gap-3 flex-nowrap">
        {showSelect && onPageSizeChange ? (
          <label className="flex items-center gap-2 text-sm flex-nowrap">
            <select
              className="select select-bordered select-sm w-auto"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.currentTarget.value))}
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="join">
          {items.map((pi, idx) =>
            pi === "…" ? (
              <button
                key={`e-${idx}`}
                className="join-item btn btn-disabled"
                aria-disabled
                tabIndex={-1}
                type="button"
              >
                ...
              </button>
            ) : (
              <button
                key={pi}
                type="button"
                className={`join-item btn ${pi === page ? "btn-active" : ""}`}
                onClick={() => onPageChange(pi)}
                disabled={pi === page}
                aria-current={pi === page ? "page" : undefined}
              >
                {pi}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/** 1, …, (page-1,page,page+1), …, last 형태로 버튼 구성 */
function buildPageItems(page: number, totalPages: number): readonly PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const last = totalPages;
  const windowStart = Math.max(2, page - 1);
  const windowEnd = Math.min(last - 1, page + 1);

  const arr: PageItem[] = [1];
  if (windowStart > 2) arr.push("…");
  for (let i = windowStart; i <= windowEnd; i += 1) arr.push(i);
  if (windowEnd < last - 1) arr.push("…");
  arr.push(last);
  return arr;
}
