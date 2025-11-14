// src/app/admin/wallets/worker/view/SystemKvView.tsx
"use client";

import type { AllowedKey } from "@/types/admin/wallets/worker";
import { useSystemKv } from "../hooks/useSystemKv";
import { useToast } from "@/components/ui";

export default function SystemKvView() {
  const {
    state: { allowed, active, selected, val, loading, saving, error },
    actions: { setSelected, setVal, load, save },
  } = useSystemKv();
  const { toast } = useToast();

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">SystemKV 편집 (하나만 유지)</h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              void load();
            }}
            disabled={loading}
          >
            {loading ? "불러오는 중…" : "새로고침"}
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <label className="form-control">
            <div className="label">
              <span className="label-text">Key</span>
            </div>
            <select
              className="select select-bordered"
              name="key"
              value={selected}
              onChange={(e) => setSelected(e.target.value as AllowedKey)}
            >
              {allowed.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control">
            <div className="label">
              <span className="label-text">Value</span>
            </div>
            <input
              name="value"
              className="input input-bordered"
              placeholder="값을 입력하세요"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !saving) {
                  void save()
                    .then(() => toast({ title: "저장됨" }))
                    .catch((e) =>
                      toast({
                        title: "저장 실패",
                        description: String(e),
                        variant: "error",
                      })
                    );
                }
              }}
            />
          </label>

          <div className="flex items-end">
            <button
              className={`btn w-full md:w-auto ${
                saving ? "btn-disabled" : "btn-primary"
              }`}
              onClick={() =>
                void save()
                  .then(() => toast({ title: "저장됨" }))
                  .catch((e) =>
                    toast({
                      title: "저장 실패",
                      description: String(e),
                      variant: "error",
                    })
                  )
              }
              disabled={saving}
            >
              {saving ? "저장중…" : "저장"}
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 rounded-xl border p-3 text-sm">
          <div className="px-2 py-1 text-base-content/60">현재 활성 Key</div>
          <div className="px-2 py-1 text-base-content/60">Value</div>
          <div className="px-2 py-1 text-base-content/60">Updated</div>

          <div className="px-2 py-1 font-mono">{active.key}</div>
          <div className="px-2 py-1 break-all">
            {active.value || <span className="text-base-content/60">-</span>}
          </div>
          <div className="px-2 py-1 text-xs text-base-content/60">
            {active.updatedAt || "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
