// src/app/admin/wallets/worker/view/WorkerStatusView.tsx
"use client";

import type { WorkerStatus } from "@/types/admin/wallets/worker";
import RunnerCardView from "./RunnerCardView";

type Props = {
  status: WorkerStatus | null;
  loading: boolean;
  toggling: boolean;
  onRefresh: () => void | Promise<void>;
  onToggle: (
    p: Partial<{ balanceEnabled: boolean; sweepEnabled: boolean }>
  ) => void | Promise<void>;
  onKick: (which: "balance" | "sweep") => void | Promise<void>;
};

export default function WorkerStatusView({
  status,
  loading,
  toggling,
  onRefresh,
  onToggle,
  onKick,
}: Props) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">워커 상태</h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? "로딩…" : "상태 새로고침"}
          </button>
        </div>

        {!status ? (
          <div className="mt-3">
            {loading ? (
              <span className="text-sm opacity-70">상태를 불러오는 중…</span>
            ) : (
              <p className="text-sm opacity-60">상태 정보가 없습니다.</p>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <RunnerCardView
              title="Balance Runner"
              last={status.balanceLastRunAt}
              enabled={status.balanceEnabled}
              pendingKick={status.pendingBalanceKick}
              onToggle={() =>
                onToggle({ balanceEnabled: !status.balanceEnabled })
              }
              onKick={() => onKick("balance")}
              toggling={toggling}
            />
            <RunnerCardView
              title="Sweep Runner"
              last={status.sweepLastRunAt}
              enabled={status.sweepEnabled}
              pendingKick={status.pendingSweepKick}
              onToggle={() => onToggle({ sweepEnabled: !status.sweepEnabled })}
              onKick={() => onKick("sweep")}
              toggling={toggling}
            />
          </div>
        )}
      </div>
    </div>
  );
}
