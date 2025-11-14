// src/app/admin/users/components/view/ControlsView.tsx
"use client";

import { PAGE_SIZES, SORT_OPTIONS } from "@/types/admin/users";

//import { SORT_OPTIONS, PAGE_SIZES } from "../../../types/users";

export function ControlsView(props: {
  pendingQ: string;
  setPendingQ: (v: string) => void;
  sort: string;
  pageSize: number;
  onSortChange: (v: string) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const {
    pendingQ,
    setPendingQ,
    sort,
    pageSize,
    onSortChange,
    onPageSizeChange,
  } = props;

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <div className="flex flex-wrap items-end gap-3">
          <label className="form-control w-64">
            <span className="label-text">검색</span>
            <input
              name="q"
              type="text"
              className="input input-bordered"
              placeholder="아이디/이름/이메일/추천코드"
              value={pendingQ}
              onChange={(e) => setPendingQ(e.target.value)}
            />
          </label>

          <label className="form-control w-56">
            <span className="label-text">정렬</span>
            <select
              name="sort"
              className="select select-bordered"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control w-40">
            <span className="label-text">페이지 크기</span>
            <select
              name="size"
              className="select select-bordered"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}개씩
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
