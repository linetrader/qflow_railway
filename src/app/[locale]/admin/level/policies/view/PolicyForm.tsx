// FILE: /src/app/admin/level/policies/view/PolicyForm.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  LevelPolicyStructureInput,
  LevelInput,
  GroupInput,
  RequirementInput,
} from "@/types/admin/level-policies";
import { LevelCard } from "./components/LevelCard";

export type PolicyFormValue = {
  name: string;
  isActive: boolean;
  structure?: LevelPolicyStructureInput;
};

export type PolicyFormProps = {
  initial?: PolicyFormValue;
  submitLabel: string;
  onSubmit: (value: PolicyFormValue) => Promise<void> | void;
  onCancel: () => void;
  disabled?: boolean;
};

type ReqState = RequirementInput;
type GroupState = GroupInput;
type LevelState = LevelInput;

function makeEmptyRequirement(): ReqState {
  return { kind: "NODE_AMOUNT_MIN", amount: "" };
}
function makeEmptyGroup(nextOrdinal: number): GroupState {
  return { ordinal: nextOrdinal, requirements: [makeEmptyRequirement()] };
}
function makeEmptyLevel(nextLevelNo: number): LevelState {
  return { level: nextLevelNo, groups: [makeEmptyGroup(1)] };
}

export default function PolicyForm(props: PolicyFormProps) {
  const { submitLabel, onSubmit, onCancel, disabled } = props;

  const [name, setName] = useState(" ");
  const [isActive, setIsActive] = useState(true);
  const [levels, setLevels] = useState<LevelState[]>([]);

  const isDisabled: boolean = disabled ?? false;

  // 초기값 반영
  useEffect(() => {
    if (props.initial) {
      setName(props.initial.name);
      setIsActive(props.initial.isActive);
      if (props.initial.structure?.levels?.length) {
        const cloned: LevelState[] = props.initial.structure.levels.map(
          (lv) => ({
            level: lv.level,
            groups: lv.groups.map((g) => ({
              ordinal: g.ordinal,
              requirements: g.requirements.map((r) => ({
                kind: r.kind,
                amount: r.amount,
                count: r.count,
                targetLevel: r.targetLevel,
              })),
            })),
          })
        );
        setLevels(cloned);
      } else {
        setLevels([makeEmptyLevel(1)]);
      }
    } else {
      setLevels([makeEmptyLevel(1)]);
    }
  }, [props.initial]);

  // 검증
  const validationError = useMemo(() => {
    if (name.trim().length === 0) return "이름을 입력해 주세요.";
    if (levels.length === 0) return "최소 1개 레벨이 필요합니다.";
    for (const lv of levels) {
      if (!Number.isFinite(lv.level) || lv.level <= 0)
        return "레벨 번호는 1 이상의 정수여야 합니다.";
      if (lv.groups.length === 0)
        return `레벨 ${lv.level}에 최소 1개 그룹이 필요합니다.`;
      for (const g of lv.groups) {
        if (!Number.isFinite(g.ordinal) || g.ordinal <= 0)
          return `레벨 ${lv.level}의 그룹 ordinal은 1 이상의 정수여야 합니다.`;
        if (g.requirements.length === 0)
          return `레벨 ${lv.level} 그룹 ${g.ordinal}에 최소 1개 요건이 필요합니다.`;
        for (const r of g.requirements) {
          if (
            r.kind === "NODE_AMOUNT_MIN" ||
            r.kind === "GROUP_SALES_AMOUNT_MIN"
          ) {
            if (!r.amount || r.amount.trim().length === 0) {
              return `레벨 ${lv.level} 그룹 ${g.ordinal}의 금액 요건에 amount가 필요합니다.`;
            }
          } else if (r.kind === "DIRECT_REFERRAL_COUNT_MIN") {
            if (!Number.isFinite(r.count) || (r.count as number) <= 0) {
              return `레벨 ${lv.level} 그룹 ${g.ordinal}의 count가 필요합니다.`;
            }
          } else if (r.kind === "DIRECT_DOWNLINE_LEVEL_COUNT_MIN") {
            if (
              !Number.isFinite(r.targetLevel) ||
              (r.targetLevel as number) <= 0
            ) {
              return `레벨 ${lv.level} 그룹 ${g.ordinal}의 targetLevel이 필요합니다.`;
            }
            if (!Number.isFinite(r.count) || (r.count as number) <= 0) {
              return `레벨 ${lv.level} 그룹 ${g.ordinal}의 count가 필요합니다.`;
            }
          }
        }
      }
    }
    return null;
  }, [levels, name]);

  const canSubmit = validationError === null && !disabled;

  // ===== 상태 조작 핸들러들 =====
  const addLevel = useCallback(() => {
    const nextNo =
      levels.length > 0 ? Math.max(...levels.map((l) => l.level)) + 1 : 1;
    setLevels((prev) => [...prev, makeEmptyLevel(nextNo)]);
  }, [levels]);

  const removeLevel = useCallback((levelIdx: number) => {
    setLevels((prev) => prev.filter((_, i) => i !== levelIdx));
  }, []);

  const updateLevelNo = useCallback((levelIdx: number, nextNo: number) => {
    setLevels((prev) => {
      const draft = [...prev];
      draft[levelIdx] = { ...draft[levelIdx], level: nextNo };
      return draft;
    });
  }, []);

  const addGroup = useCallback((levelIdx: number) => {
    setLevels((prev) => {
      const draft = [...prev];
      const nextOrdinal =
        draft[levelIdx].groups.length > 0
          ? Math.max(...draft[levelIdx].groups.map((g) => g.ordinal)) + 1
          : 1;
      draft[levelIdx] = {
        ...draft[levelIdx],
        groups: [...draft[levelIdx].groups, makeEmptyGroup(nextOrdinal)],
      };
      return draft;
    });
  }, []);

  const removeGroup = useCallback((levelIdx: number, groupIdx: number) => {
    setLevels((prev) => {
      const draft = [...prev];
      draft[levelIdx] = {
        ...draft[levelIdx],
        groups: draft[levelIdx].groups.filter((_, i) => i !== groupIdx),
      };
      return draft;
    });
  }, []);

  const updateGroupOrdinal = useCallback(
    (levelIdx: number, groupIdx: number, nextOrdinal: number) => {
      setLevels((prev) => {
        const draft = [...prev];
        const groups = [...draft[levelIdx].groups];
        groups[groupIdx] = { ...groups[groupIdx], ordinal: nextOrdinal };
        draft[levelIdx] = { ...draft[levelIdx], groups };
        return draft;
      });
    },
    []
  );

  const addRequirement = useCallback((levelIdx: number, groupIdx: number) => {
    setLevels((prev) => {
      const draft = [...prev];
      const groups = [...draft[levelIdx].groups];
      const target = groups[groupIdx];
      const nextReqs = [...target.requirements, makeEmptyRequirement()];
      groups[groupIdx] = { ...target, requirements: nextReqs };
      draft[levelIdx] = { ...draft[levelIdx], groups };
      return draft;
    });
  }, []);

  const removeRequirement = useCallback(
    (levelIdx: number, groupIdx: number, reqIdx: number) => {
      setLevels((prev) => {
        const draft = [...prev];
        const groups = [...draft[levelIdx].groups];
        const target = groups[groupIdx];
        const nextReqs = target.requirements.filter((_, i) => i !== reqIdx);
        groups[groupIdx] = { ...target, requirements: nextReqs };
        draft[levelIdx] = { ...draft[levelIdx], groups };
        return draft;
      });
    },
    []
  );

  const updateRequirement = useCallback(
    (
      levelIdx: number,
      groupIdx: number,
      reqIdx: number,
      patch: Partial<ReqState>
    ) => {
      setLevels((prev) => {
        const draft = [...prev];
        const groups = [...draft[levelIdx].groups];
        const target = groups[groupIdx];
        const reqs = [...target.requirements];
        const next: ReqState = { ...reqs[reqIdx], ...patch };

        if (patch.kind) {
          if (
            patch.kind === "NODE_AMOUNT_MIN" ||
            patch.kind === "GROUP_SALES_AMOUNT_MIN"
          ) {
            next.count = undefined;
            next.targetLevel = undefined;
            if (!next.amount) next.amount = "";
          } else if (patch.kind === "DIRECT_REFERRAL_COUNT_MIN") {
            next.amount = undefined;
            next.targetLevel = undefined;
            if (!Number.isFinite(next.count as number)) next.count = 1;
          } else if (patch.kind === "DIRECT_DOWNLINE_LEVEL_COUNT_MIN") {
            next.amount = undefined;
            if (!Number.isFinite(next.targetLevel as number))
              next.targetLevel = 1;
            if (!Number.isFinite(next.count as number)) next.count = 1;
          }
        }

        reqs[reqIdx] = next;
        groups[groupIdx] = { ...target, requirements: reqs };
        draft[levelIdx] = { ...draft[levelIdx], groups };
        return draft;
      });
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const payload: LevelPolicyStructureInput = {
      levels: levels.map<LevelInput>((lv) => ({
        level: lv.level,
        groups: lv.groups.map<GroupInput>((g) => ({
          ordinal: g.ordinal,
          requirements: g.requirements.map<RequirementInput>((r) => ({
            kind: r.kind,
            amount: r.amount,
            count: r.count,
            targetLevel: r.targetLevel,
          })),
        })),
      })),
    };
    await onSubmit({ name: name.trim(), isActive, structure: payload });
  }, [canSubmit, levels, onSubmit, name, isActive]);

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h3 className="card-title text-base">기본 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Policy name"
                disabled={disabled}
              />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-between">
                <span className="label-text">Active</span>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={disabled}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 레벨/그룹/요건 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-base">레벨 구성</h3>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={addLevel}
              disabled={disabled}
            >
              + Add Level
            </button>
          </div>

          <div className="space-y-3">
            {levels.map((lv, levelIdx) => (
              <LevelCard
                key={`level-${lv.level}-${levelIdx}`}
                levelNo={lv.level}
                groups={lv.groups}
                disabled={isDisabled}
                onChangeLevelNo={(next) => updateLevelNo(levelIdx, next)}
                onRemoveLevel={() => removeLevel(levelIdx)}
                onAddGroup={() => addGroup(levelIdx)}
                onChangeGroupOrdinal={(groupIdx, nextOrdinal) =>
                  updateGroupOrdinal(levelIdx, groupIdx, nextOrdinal)
                }
                onRemoveGroup={(groupIdx) => removeGroup(levelIdx, groupIdx)}
                onAddRequirement={(groupIdx) =>
                  addRequirement(levelIdx, groupIdx)
                }
                onUpdateRequirement={(groupIdx, reqIdx, patch) =>
                  updateRequirement(levelIdx, groupIdx, reqIdx, patch)
                }
                onRemoveRequirement={(groupIdx, reqIdx) =>
                  removeRequirement(levelIdx, groupIdx, reqIdx)
                }
              />
            ))}

            {levels.length === 0 ? (
              <div className="alert">
                <span>
                  레벨이 없습니다.{" "}
                  <span className="kbd kbd-xs">+ Add Level</span> 로 추가하세요.
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 액션/검증 */}
      {validationError ? (
        <div className="alert alert-error">
          <span>{validationError}</span>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
