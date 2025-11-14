// src/app/admin/wallets/worker/view/RunnerCardView.tsx
"use client";

type Props = {
  title: string;
  last: string | null;
  enabled: boolean;
  pendingKick: boolean;
  toggling: boolean;
  onToggle: () => void;
  onKick: () => void;
};

export default function RunnerCardView({
  title,
  last,
  enabled,
  pendingKick,
  toggling,
  onToggle,
  onKick,
}: Props) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">{title}</div>
          <div className="text-xs text-base-content/60">
            last: {last ?? "-"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`btn btn-sm ${enabled ? "btn-warning" : "btn-outline"}`}
            onClick={onToggle}
            disabled={toggling}
          >
            {enabled ? "활성 → 비활성" : "비활성 → 활성"}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={onKick}
            disabled={toggling}
            aria-label={`${title} 즉시 실행`}
          >
            킥(Kick)
          </button>
          {pendingKick && (
            <span className="text-xs text-warning">대기중 신호 있음</span>
          )}
        </div>
      </div>
    </div>
  );
}
