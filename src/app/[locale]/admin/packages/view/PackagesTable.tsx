// src/app/admin/packages/view/PackagesTable.tsx
"use client";

import Link from "next/link";
import type { PackageRow } from "@/types/admin/packages";
import { HistoryTable } from "@/components/ui";
import { Pagination } from "@/components/ui/Navigation/Pagination";

type Props = {
  items: PackageRow[];
  page?: number;
  size?: number;
  total?: number;
  onPageChange?: (next: number) => void;
  onSizeChange?: (next: number) => void;
};

export default function PackagesTable({
  items,
  page,
  size,
  total,
  onPageChange,
  onSizeChange,
}: Props) {
  const head: readonly string[] = ["이름", "가격", "일일 DFT", "상세"] as const;

  const rows: ReadonlyArray<readonly string[]> = items.map((p) => [
    p.name,
    String(p.price),
    String(p.dailyDftAmount),
    p.id,
  ]);

  // 페이지네이션 표시 여부: 값이 존재(undef 아님)하고 onPageChange가 있을 때만
  const canPaginate =
    page !== undefined &&
    size !== undefined &&
    total !== undefined &&
    onPageChange !== undefined;

  return (
    <div className="card p-3 space-y-3">
      <HistoryTable
        head={head}
        rows={rows}
        emptyLabel="데이터가 없습니다."
        className="overflow-x-auto"
        tableClassName="table w-full"
        showIndex={false}
        colAlign={["left", "right", "right", "center"]}
        minColWidthPx={140}
        cellRender={(_, colIdx, cell) => {
          if (colIdx === 1 || colIdx === 2) {
            return <span className="tabular-nums">{cell}</span>;
          }
          if (colIdx === 3) {
            return (
              <Link
                href={`/admin/packages/${cell}`}
                className="link link-primary"
              >
                보기
              </Link>
            );
          }
          return cell;
        }}
      />

      {canPaginate ? (
        <Pagination
          total={total as number}
          page={page as number}
          pageSize={size as number}
          onPageChange={onPageChange as (next: number) => void}
          onPageSizeChange={onSizeChange}
        />
      ) : null}
    </div>
  );
}
