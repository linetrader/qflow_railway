// src/app/admin/packages/user/view/UserPackageTableView.tsx
"use client";

import type { UserPackageRow } from "@/types/admin/packages/user";
import { fmtDate, fmtNum } from "../hooks/useUserPackages";
import { HistoryTable } from "@/components/ui";
import { Pagination } from "@/components/ui/Navigation/Pagination";

type Props = {
  rows: UserPackageRow[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
};

export default function UserPackageTableView({
  rows,
  page,
  pageSize,
  total,
  onPageChange,
}: Props) {
  const head: readonly string[] = [
    "Username",
    "Level",
    "Country",
    "Package",
    "Quantity",
    "Created",
    "Updated",
  ] as const;

  const tableRows: ReadonlyArray<readonly string[]> =
    rows.length === 0
      ? []
      : rows.map((r) => [
          r.username,
          fmtNum(r.level),
          r.countryCode ?? "-",
          r.packageName,
          fmtNum(r.quantity),
          fmtDate(r.createdAt),
          fmtDate(r.updatedAt),
        ]);

  return (
    <div className="card p-3 space-y-3">
      <HistoryTable
        head={head}
        rows={tableRows}
        emptyLabel="데이터가 없습니다."
        className="overflow-x-auto"
        tableClassName="table w-full"
        showIndex={false}
        colAlign={["left", "right", "center", "left", "right", "left", "left"]}
        minColWidthPx={140}
        cellRender={(_, colIdx, cell) => {
          if (colIdx === 1 || colIdx === 4) {
            return <span className="tabular-nums">{cell}</span>;
          }
          if (colIdx === 5 || colIdx === 6) {
            return (
              <span className="whitespace-nowrap text-xs opacity-70">
                {cell}
              </span>
            );
          }
          return cell;
        }}
      />

      {/* 공용 Pagination UI 사용 */}
      <Pagination
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        // onPageSizeChange를 전달하지 않으면 크기 선택 드롭다운은 표시되지 않습니다.
      />
    </div>
  );
}
