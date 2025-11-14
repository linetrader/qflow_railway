// src/app/admin/packages/history/view/HistoryTableView.tsx
"use client";

import type { PackageHistoryRow } from "@/types/admin/packages/history";
import { HistoryTable } from "@/components/ui/data/HistoryTable";
import { Pagination } from "@/components/ui/Navigation/Pagination";

type Props = {
  rows: PackageHistoryRow[];
  page: number; // 1-based
  pageSize: number;
  total: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange?: (nextSize: number) => void;
  zebra?: boolean;
  dense?: boolean;
  stickyHeader?: boolean;
};

/** 숫자 포맷 */
function num(v: string | number): string {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toLocaleString("ko-KR") : String(v);
}

/** ISO → YYYY-MM-DD HH:mm */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  const HH = `${d.getHours()}`.padStart(2, "0");
  const MM = `${d.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}`;
}

/** r[key]가 number|string 인지 런타임 안전 확인 */
function getNumberish(
  r: Record<string, unknown>,
  key: string
): string | number | undefined {
  const v = r[key];
  if (typeof v === "number" || typeof v === "string") return v;
  return undefined;
}

export default function HistoryTableView({
  rows,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  zebra,
  dense,
}: Props) {
  const head: readonly string[] = [
    "시각",
    "Username",
    "Package",
    "Quantity",
    "Unit Price",
    "Total Price",
  ] as const;

  const tableRows: ReadonlyArray<readonly string[]> =
    rows.length === 0
      ? []
      : rows.map((r) => {
          const unitPrice = getNumberish(
            r as Record<string, unknown>,
            "unitPrice"
          );
          const totalPrice = getNumberish(
            r as Record<string, unknown>,
            "totalPrice"
          );
          return [
            fmtDate(r.createdAt),
            r.username,
            r.packageName,
            num(r.quantity),
            unitPrice !== undefined ? num(unitPrice) : "-",
            totalPrice !== undefined ? num(totalPrice) : "-",
          ];
        });

  const tableClassName = [
    "table w-full",
    zebra ? "table-zebra" : "",
    dense ? "table-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <HistoryTable
          head={head}
          rows={tableRows}
          emptyLabel="데이터가 없습니다."
          className=""
          tableClassName={tableClassName}
          showIndex={false}
          colAlign={["left", "left", "left", "right", "right", "right"]}
          minColWidthPx={140}
          cellRender={(_, colIdx, cell) => {
            // 날짜
            if (colIdx === 0) {
              return (
                <span className="whitespace-nowrap text-xs text-base-content/70">
                  {cell}
                </span>
              );
            }
            // 숫자
            if (colIdx === 3 || colIdx === 4 || colIdx === 5) {
              return <span className="tabular-nums">{cell}</span>;
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
  );
}
