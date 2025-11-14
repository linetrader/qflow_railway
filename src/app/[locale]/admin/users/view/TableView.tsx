// src/app/admin/users/components/view/TableView.tsx
"use client";

import type { UserRow } from "@/types/admin/users";
import Link from "next/link";
import { HistoryTable } from "@/components/ui"; // HistoryTable
import { Pagination } from "@/components/ui/Navigation/Pagination"; // 공용 Pagination

export function TableView(props: {
  items: UserRow[] | null | undefined;
  loading: boolean;
  error: string | null;
  selected: Set<string>;
  toggleOne: (id: string) => void;
  allOnPageSelected: boolean;
  toggleSelectAllOnPage: () => void;
  // pagination
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const {
    items,
    loading,
    error,
    selected,
    toggleOne,
    allOnPageSelected,
    toggleSelectAllOnPage,
    total,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
  } = props;

  const head: readonly string[] = [
    "선택",
    "아이디",
    "이름",
    "이메일",
    "레벨",
    "국가",
    "OTP",
    "가입일",
    "상세",
  ] as const;

  const rows: ReadonlyArray<readonly string[]> = !items?.length
    ? []
    : items.map((u) => [
        "", // 선택 체크박스는 cellRender에서 렌더링
        u.username,
        u.name ?? "",
        u.email ?? "",
        String(u.level ?? ""),
        u.countryCode ?? "-",
        u.googleOtpEnabled ? "사용" : "미사용",
        new Date(u.createdAt).toLocaleString(),
        u.id, // 상세 링크용 id
      ]);

  const emptyLabel =
    loading && !items
      ? "불러오는 중…"
      : error && !items
      ? `오류: ${error}`
      : "결과 없음";

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-3">
        {/* 상단 툴바: 현재 페이지 전체 선택 */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="select all on page"
              checked={allOnPageSelected}
              onChange={toggleSelectAllOnPage}
            />
            <span className="text-sm text-base-content/70">
              현재 페이지 전체 선택
            </span>
          </label>
          {/* 필요 시 다른 액션 버튼을 여기에 배치 */}
        </div>

        <div className="overflow-x-auto">
          <HistoryTable
            head={head}
            rows={rows}
            emptyLabel={emptyLabel}
            className=""
            tableClassName="table table-sm w-full"
            showIndex={false}
            colAlign={[
              "center", // 선택
              "left",
              "left",
              "left",
              "left",
              "left",
              "left",
              "left",
              "left",
            ]}
            minColWidthPx={120}
            cellRender={(rowIdx, colIdx, cell) => {
              // 선택 체크박스
              if (colIdx === 0) {
                const u = items?.[rowIdx];
                if (!u) return "";
                return (
                  <input
                    type="checkbox"
                    aria-label={`select ${u.username}`}
                    checked={selected.has(u.id)}
                    onChange={() => toggleOne(u.id)}
                  />
                );
              }
              // 가입일: 작은 글씨 + 줄바꿈 방지
              if (colIdx === 7) {
                return (
                  <span className="whitespace-nowrap text-xs text-base-content/70">
                    {cell}
                  </span>
                );
              }
              // 상세 링크
              if (colIdx === 8) {
                const id = cell;
                return (
                  <Link
                    href={`/admin/users/${id}`}
                    className="btn btn-link no-underline px-0"
                  >
                    보기
                  </Link>
                );
              }
              return cell;
            }}
          />
        </div>

        {/* 공용 Pagination UI */}
        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          className=""
        />
      </div>
    </div>
  );
}
