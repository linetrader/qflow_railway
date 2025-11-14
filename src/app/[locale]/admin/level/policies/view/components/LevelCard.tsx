// FILE: /src/app/admin/level/policies/view/components/LevelCard.tsx
"use client";

import type {
  GroupInput,
  RequirementInput,
} from "@/types/admin/level-policies";
import { memo } from "react";
import { GroupCard } from "./GroupCard";

export type LevelCardProps = {
  levelNo: number;
  groups: GroupInput[];
  disabled: boolean;
  onChangeLevelNo: (nextNo: number) => void;
  onRemoveLevel: () => void;
  onAddGroup: () => void;
  onChangeGroupOrdinal: (groupIdx: number, nextOrdinal: number) => void;
  onRemoveGroup: (groupIdx: number) => void;
  onAddRequirement: (groupIdx: number) => void;
  onUpdateRequirement: (
    groupIdx: number,
    reqIdx: number,
    patch: Partial<RequirementInput>
  ) => void;
  onRemoveRequirement: (groupIdx: number, reqIdx: number) => void;
};

function LevelCardBase({
  levelNo,
  groups,
  disabled,
  onChangeLevelNo,
  onRemoveLevel,
  onAddGroup,
  onChangeGroupOrdinal,
  onRemoveGroup,
  onAddRequirement,
  onUpdateRequirement,
  onRemoveRequirement,
}: LevelCardProps) {
  return (
    <div className="collapse collapse-arrow bg-warning/10 rounded-box">
      {/* 겹침 방지: 좌측 아이콘 영역 확보 */}
      <input type="checkbox" defaultChecked />
      <div className="collapse-title pl-10">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <span className="badge badge-primary">Level {levelNo}</span>
          <span className="opacity-0">.</span>
          <div className="join">
            <input
              type="number"
              className="input input-bordered join-item w-24"
              value={levelNo}
              min={1}
              onChange={(e) => onChangeLevelNo(Number(e.target.value))}
              disabled={disabled}
              aria-label="Level No."
            />
            <button
              type="button"
              className="btn btn-error join-item"
              onClick={onRemoveLevel}
              disabled={disabled}
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <div className="collapse-content space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Groups</span>
          <button
            type="button"
            className="btn btn-xs btn-outline"
            onClick={onAddGroup}
            disabled={disabled}
          >
            + Add Group
          </button>
        </div>

        {groups.map((g, groupIdx) => (
          <GroupCard
            key={`${levelNo}-${g.ordinal}-${groupIdx}`}
            group={g}
            disabled={disabled}
            onChangeOrdinal={(next) => onChangeGroupOrdinal(groupIdx, next)}
            onRemove={() => onRemoveGroup(groupIdx)}
            onAddRequirement={() => onAddRequirement(groupIdx)}
            onUpdateRequirement={(reqIdx, patch) =>
              onUpdateRequirement(groupIdx, reqIdx, patch)
            }
            onRemoveRequirement={(reqIdx) =>
              onRemoveRequirement(groupIdx, reqIdx)
            }
          />
        ))}
      </div>
    </div>
  );
}

export const LevelCard = memo(LevelCardBase);
