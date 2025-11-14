// FILE: /src/app/admin/level/policies/view/components/GroupCard.tsx
"use client";

import type {
  GroupInput,
  RequirementInput,
} from "@/types/admin/level-policies";
import { memo } from "react";
import { RequirementRow } from "./RequirementRow";

export type GroupCardProps = {
  group: GroupInput;
  disabled: boolean;
  onChangeOrdinal: (nextOrdinal: number) => void;
  onRemove: () => void;
  onAddRequirement: () => void;
  onUpdateRequirement: (
    reqIdx: number,
    patch: Partial<RequirementInput>
  ) => void;
  onRemoveRequirement: (reqIdx: number) => void;
};

function GroupCardBase({
  group,
  disabled,
  onChangeOrdinal,
  onRemove,
  onAddRequirement,
  onUpdateRequirement,
  onRemoveRequirement,
}: GroupCardProps) {
  return (
    <div className="card bg-base-100 border">
      <div className="card-body gap-3">
        <div className="flex items-center gap-3">
          <span className="badge">Group</span>
          <div className="join">
            <input
              type="number"
              className="input input-bordered join-item w-24"
              value={group.ordinal}
              min={1}
              onChange={(e) => onChangeOrdinal(Number(e.target.value))}
              disabled={disabled}
              aria-label="Group Ordinal"
            />
            <button
              type="button"
              className="btn btn-ghost join-item"
              onClick={onRemove}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        </div>

        <div className="divider my-0">Requirements</div>

        <div className="space-y-2">
          {group.requirements.map((r, idx) => (
            <RequirementRow
              key={idx}
              req={r}
              disabled={disabled}
              onChange={(patch) => onUpdateRequirement(idx, patch)}
              onRemove={() => onRemoveRequirement(idx)}
            />
          ))}

          <div>
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={onAddRequirement}
              disabled={disabled}
            >
              + Add Requirement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const GroupCard = memo(GroupCardBase);
