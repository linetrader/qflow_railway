// FILE: /src/app/admin/mining/policies/view/PoliciesTable.tsx
"use client";

import { useMemo } from "react";
import type { MiningPolicyListItem } from "@/types/admin/mining-policies";

export type TableActions = {
  onEdit: (item: MiningPolicyListItem) => void;
  onDelete: (item: MiningPolicyListItem) => void;
};

export type Props = {
  items: MiningPolicyListItem[] | null;
  loading: boolean;
  onRefresh: () => void;
  actions?: TableActions;
};

function formatDate(iso?: string): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

export default function PoliciesTable(props: Props) {
  const { items, loading, onRefresh, actions } = props;

  const rows = useMemo(
    () =>
      (items ?? []).map((p) => ({
        id: p.id,
        activeLabel: p.isActive ? "active" : "inactive",
        name: p.name,
        pct: `${p.companyPct}/${p.selfPct}/${p.mlmPct}`,
        mlmPlan: p.mlmReferralPlanName ?? "-",
        lvlPlan: p.levelBonusPlanName ?? "-",
        effective: `${formatDate(p.effectiveFrom)} ~ ${formatDate(
          p.effectiveTo
        )}`,
        updatedAt: formatDate(p.updatedAt),
        createdAt: formatDate(p.createdAt),
      })),
    [items]
  );

  const count = rows.length;

  return (
    <div className="card p-4 space-y-4">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Mining Policies</h2>
            <span className="badge badge-neutral" aria-label="total policies">
              {count}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-base-content/60">
              {loading ? "Loading..." : "Loaded"}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-left min-w-[100px]">Active</th>
                <th className="text-left min-w-[180px]">Name</th>
                <th className="text-left min-w-[140px]">Pct(c/s/m)</th>
                <th className="text-left min-w-[160px]">MLM Plan</th>
                <th className="text-left min-w-[160px]">Level Plan</th>
                <th className="text-left min-w-[240px]">Effective</th>
                <th className="text-left min-w-[140px]">Updated</th>
                <th className="text-left min-w-[140px]">Created</th>
                <th className="text-left min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="text-left" colSpan={9}>
                    {loading ? "Loading..." : "No policies"}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="text-left">{r.activeLabel}</td>
                    <td className="text-left">{r.name}</td>
                    <td className="text-left">{r.pct}</td>
                    <td className="text-left">{r.mlmPlan}</td>
                    <td className="text-left">{r.lvlPlan}</td>
                    <td className="text-left">{r.effective}</td>
                    <td className="text-left">{r.updatedAt}</td>
                    <td className="text-left">{r.createdAt}</td>
                    <td className="text-left">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-xs"
                          onClick={() =>
                            actions &&
                            actions.onEdit(
                              (items ?? []).find(
                                (x) => x.id === r.id
                              ) as MiningPolicyListItem
                            )
                          }
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-error"
                          onClick={() =>
                            actions &&
                            actions.onDelete(
                              (items ?? []).find(
                                (x) => x.id === r.id
                              ) as MiningPolicyListItem
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
