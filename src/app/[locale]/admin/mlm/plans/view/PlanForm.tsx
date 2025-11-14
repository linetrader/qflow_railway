"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MlmPlanCreateBody,
  MlmPlanStructureInput,
  MlmLevelInput,
} from "@/types/admin/level-policies/mlm-referral-plans";

export type PlanFormValue = MlmPlanCreateBody;
export type PlanFormProps = {
  initial?: Partial<PlanFormValue>;
  submitLabel: string;
  onSubmit: (v: PlanFormValue) => Promise<void> | void;
  onCancel: () => void;
  disabled?: boolean;
};

export default function PlanForm(props: PlanFormProps) {
  const { submitLabel, onSubmit, onCancel, disabled } = props;
  const [name, setName] = useState(" ");
  const [isActive, setIsActive] = useState(true);
  const [levels, setLevels] = useState<MlmLevelInput[]>([]);

  useEffect(() => {
    if (props.initial) {
      if (typeof props.initial.name === "string") setName(props.initial.name);
      if (typeof props.initial.isActive === "boolean")
        setIsActive(props.initial.isActive);
      if (props.initial.structure?.levels)
        setLevels(props.initial.structure.levels);
    }
  }, [props.initial]);

  const isDisabled: boolean = disabled ?? false;

  const addLevel = () =>
    setLevels((arr) => [
      ...arr,
      { level: Math.max(0, ...arr.map((a) => a.level)) + 1, percent: "0.00" },
    ]);
  const removeLevel = (idx: number) =>
    setLevels((arr) => arr.filter((_, i) => i !== idx));
  const updateLevel = (idx: number, patch: Partial<MlmLevelInput>) =>
    setLevels((arr) =>
      arr.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );

  const validationError = useMemo(() => {
    if (name.trim().length === 0) return "이름을 입력해 주세요.";
    for (const l of levels) {
      if (typeof l.level !== "number") return "level은 숫자여야 합니다.";
      if (!l.percent || l.percent.trim().length === 0)
        return `레벨 ${l.level}의 percent가 필요합니다.`;
    }
    return null;
  }, [name, levels]);

  const canSubmit = validationError === null && !isDisabled;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const structure: MlmPlanStructureInput = {
      levels: levels.map((l) => ({ level: l.level, percent: l.percent })),
    };
    const payload: PlanFormValue = { name: name.trim(), isActive, structure };
    await onSubmit(payload);
  }, [canSubmit, levels, name, isActive, onSubmit]);

  return (
    <div className="space-y-6">
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
                placeholder="Plan name"
                disabled={isDisabled}
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
                  disabled={isDisabled}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-base">레벨 구성</h3>
            <button
              type="button"
              className="btn btn-sm"
              onClick={addLevel}
              disabled={isDisabled}
            >
              + Add Level
            </button>
          </div>
          {levels.length === 0 ? (
            <div className="text-sm text-base-content/60">
              레벨이 없습니다. 추가 버튼으로 생성하세요.
            </div>
          ) : (
            <div className="space-y-3">
              {levels.map((lv, idx) => (
                <div key={idx} className="rounded-box border p-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Level</span>
                      </label>
                      <input
                        type="number"
                        className="input input-bordered"
                        value={lv.level}
                        onChange={(e) =>
                          updateLevel(idx, { level: Number(e.target.value) })
                        }
                        disabled={isDisabled}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Percent</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered"
                        value={lv.percent}
                        onChange={(e) =>
                          updateLevel(idx, { percent: e.target.value })
                        }
                        placeholder="e.g., 5.00"
                        disabled={isDisabled}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="btn btn-error btn-outline"
                        onClick={() => removeLevel(idx)}
                        disabled={isDisabled}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
          disabled={isDisabled}
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
