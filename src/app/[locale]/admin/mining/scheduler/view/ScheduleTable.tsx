// src/app/admin/mining/scheduler/view/ScheduleTable.tsx
"use client";

import type { MiningScheduleItem } from "@/types/admin/mining-scheduler";
import { HistoryTable } from "@/components/ui/data/HistoryTable";

type Props = {
  items: MiningScheduleItem[];
  onToggleActive: (id: string, nextActive: boolean) => void | Promise<void>;
  onRunStop: (id: string, currentlyActive: boolean) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
};

export default function ScheduleTable(props: Props) {
  const { items, onToggleActive, onRunStop, onDelete } = props;

  const head: readonly string[] = [
    "ID",
    "이름",
    "종류",
    "상태",
    "다음 실행",
    "정책",
    "액션",
  ] as const;

  const rows: ReadonlyArray<readonly string[]> =
    items.length === 0
      ? []
      : items.map((s) => {
          const kindLabel = s.kind === "INTERVAL" ? "간격 실행" : "일별 실행";
          const statusLabel = s.isActive ? "실행 중" : "중지";
          const nextRun = s.nextRunAt ? fmt(s.nextRunAt) : "-";
          const policy = s.policyName ?? s.policyId;
          // 액션 컬럼은 cellRender로 그릴 것이므로 placeholder만 둡니다.
          return [
            s.id,
            s.name ?? "-",
            kindLabel,
            statusLabel,
            nextRun,
            policy,
            "",
          ];
        });

  return (
    <div className="card p-3">
      <HistoryTable
        head={head}
        rows={rows}
        emptyLabel="스케줄이 없습니다."
        className="overflow-x-auto"
        tableClassName="table w-full"
        showIndex={false}
        colAlign={["left", "left", "left", "left", "left", "left", "left"]}
        minColWidthPx={140}
        cellRender={(rowIdx, colIdx, cell) => {
          // 상태 배지
          if (colIdx === 3) {
            const isActive = cell === "실행 중";
            return (
              <span className={`badge ${isActive ? "badge-success" : ""}`}>
                {cell}
              </span>
            );
          }
          // 액션 버튼
          if (colIdx === 6) {
            const s = items[rowIdx]; // 병렬 배열 인덱스로 안전 참조
            return (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onToggleActive(s.id, !s.isActive)}
                >
                  {s.isActive ? "비활성화" : "활성화"}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    s.isActive ? "btn-error" : "btn-warning"
                  }`}
                  onClick={() => onRunStop(s.id, s.isActive)}
                >
                  {s.isActive ? "중지" : "실행"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-error"
                  onClick={() => onDelete(s.id)}
                >
                  삭제
                </button>
              </div>
            );
          }
          // ID 모노스페이스
          if (colIdx === 0) {
            return <span className="font-mono">{cell}</span>;
          }
          // 그 외 기본 출력
          return cell;
        }}
      />
    </div>
  );
}

function fmt(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
