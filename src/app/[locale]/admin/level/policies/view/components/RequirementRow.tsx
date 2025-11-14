// FILE: /src/app/admin/level/policies/view/components/RequirementRow.tsx
"use client";

import type {
  RequirementInput,
  RequirementKind,
} from "@/types/admin/level-policies";
import { memo } from "react";

export type RequirementRowProps = {
  req: RequirementInput;
  disabled: boolean;
  onChange: (patch: Partial<RequirementInput>) => void;
  onRemove: () => void;
};

const REQUIREMENT_OPTIONS: { value: RequirementKind; label: string }[] = [
  { value: "NODE_AMOUNT_MIN", label: "개인 매출 최소 (amount)" },
  { value: "GROUP_SALES_AMOUNT_MIN", label: "그룹 매출 최소 (amount)" },
  { value: "DIRECT_REFERRAL_COUNT_MIN", label: "직접추천 최소 (count)" },
  {
    value: "DIRECT_DOWNLINE_LEVEL_COUNT_MIN",
    label: "직접 하위 특정 레벨 인원 (targetLevel, count)",
  },
];

function RequirementRowBase({
  req,
  disabled,
  onChange,
  onRemove,
}: RequirementRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Kind</span>
        </label>
        <select
          className="select select-bordered"
          value={req.kind}
          onChange={(e) =>
            onChange({ kind: e.target.value as RequirementKind })
          }
          disabled={disabled}
        >
          {REQUIREMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {(req.kind === "NODE_AMOUNT_MIN" ||
        req.kind === "GROUP_SALES_AMOUNT_MIN") && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Amount</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={req.amount ?? ""}
            onChange={(e) => onChange({ amount: e.target.value })}
            placeholder="e.g., 10000"
            disabled={disabled}
          />
        </div>
      )}

      {req.kind === "DIRECT_REFERRAL_COUNT_MIN" && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Count</span>
          </label>
          <input
            type="number"
            className="input input-bordered"
            value={req.count ?? 1}
            min={1}
            onChange={(e) => onChange({ count: Number(e.target.value) })}
            disabled={disabled}
          />
        </div>
      )}

      {req.kind === "DIRECT_DOWNLINE_LEVEL_COUNT_MIN" && (
        <>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Target Level</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={req.targetLevel ?? 1}
              min={1}
              onChange={(e) =>
                onChange({ targetLevel: Number(e.target.value) })
              }
              disabled={disabled}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Count</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={req.count ?? 1}
              min={1}
              onChange={(e) => onChange({ count: Number(e.target.value) })}
              disabled={disabled}
            />
          </div>
        </>
      )}

      <div className="form-control md:justify-end">
        <button
          type="button"
          className="btn btn-outline btn-error"
          onClick={onRemove}
          disabled={disabled}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export const RequirementRow = memo(RequirementRowBase);
