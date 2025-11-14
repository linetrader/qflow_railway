// src/components/ui/data/HistoryTable.tsx
"use client";

import React from "react";

export interface HistoryTableProps {
  head: readonly string[];
  rows: ReadonlyArray<readonly string[]>;
  emptyLabel: string;
  className?: string;
  tableClassName?: string;
  showIndex?: boolean; // PC 테이블에서만 사용됨
  colAlign?: ReadonlyArray<"left" | "center" | "right">;
  minColWidthPx?: number;
  /** 셀 커스텀 렌더러: (rowIdx, colIdx, rawCell) -> ReactNode */
  cellRender?: (
    rowIndex: number,
    colIndex: number,
    cell: string
  ) => React.ReactNode;
}

function alignToClass(a: "left" | "center" | "right"): string {
  if (a === "center") return "text-center";
  if (a === "right") return "text-right";
  return "text-left";
}

export function HistoryTable({
  head,
  rows,
  emptyLabel,
  className,
  tableClassName,
  showIndex = true,
  colAlign,
  minColWidthPx = 160,
  cellRender,
}: HistoryTableProps) {
  const colCount = head.length;
  if (colCount === 0 || rows.length === 0) {
    return (
      <div className={`overflow-x-auto ${className ?? ""}`}>
        <div className="p-4 text-sm text-base-content/60">{emptyLabel}</div>
      </div>
    );
  }

  const aligns: ("left" | "center" | "right")[] =
    colAlign && colAlign.length === colCount
      ? [...colAlign]
      : Array.from({ length: colCount }, () => "left");

  for (const [i, r] of rows.entries()) {
    if (r.length !== colCount) {
      console.warn(
        `HistoryTable: row[${i}] length ${r.length} != head length ${colCount}`
      );
    }
  }

  const minWidthPx =
    Math.max(480, colCount * minColWidthPx) + (showIndex ? 80 : 0);

  return (
    <div className={`${className ?? ""}`}>
      {/* ── Mobile(≤sm): 라벨 : 값 ── */}
      <div className="sm:hidden">
        <div className="join join-vertical w-full">
          {rows.map((r, rowIdx) => (
            <div
              key={`m-${rowIdx}`}
              className="join-item list-row px-3 py-3 border bg-base-100"
              style={{
                borderColor: "var(--table-divider-color, hsl(var(--bc) / 0.2))",
              }}
            >
              <div className="w-full space-y-1">
                {r.map((cell, cIdx) => {
                  const label = head[cIdx];
                  const isRight = aligns[cIdx] === "right";
                  const content =
                    typeof cellRender === "function"
                      ? cellRender(rowIdx, cIdx, cell)
                      : cell;
                  return (
                    <div key={`m-${rowIdx}-${cIdx}`}>
                      <span className="text-sm mr-1">{label} :</span>
                      <span
                        className={`text-sm break-words ${
                          isRight ? "tabular-nums" : ""
                        }`}
                        title={
                          typeof content === "string" ? content : undefined
                        }
                      >
                        {content}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Desktop(≥sm): Table ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table
          className={`table w-full ${tableClassName ?? ""}`}
          style={{ minWidth: `${minWidthPx}px` }}
        >
          <thead>
            <tr>
              {showIndex ? <th className="w-[56px]"></th> : null}
              {head.map((h, idx) => (
                <th key={`h-${idx}`} className={alignToClass(aligns[idx])}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, rowIdx) => (
              <tr key={`r-${rowIdx}`}>
                {showIndex ? (
                  <th className="text-center">{rowIdx + 1}</th>
                ) : null}
                {r.map((cell, cIdx) => (
                  <td
                    key={`c-${rowIdx}-${cIdx}`}
                    className={`${alignToClass(
                      aligns[cIdx]
                    )} align-middle whitespace-nowrap`}
                    title={cell}
                  >
                    {typeof cellRender === "function"
                      ? cellRender(rowIdx, cIdx, cell)
                      : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
