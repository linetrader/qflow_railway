// FILE: /src/app/admin/mining/policies/view/PolicyForm.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MiningPolicyCreateBody } from "@/types/admin/mining-policies";

export type PolicyFormValue = MiningPolicyCreateBody;

export type PolicyFormProps = {
  initial?: Partial<PolicyFormValue>;
  submitLabel: string;
  onSubmit: (value: PolicyFormValue) => Promise<void> | void;
  onCancel: () => void;
  disabled?: boolean;
};

export default function PolicyForm(props: PolicyFormProps) {
  const { submitLabel, onSubmit, onCancel, disabled } = props;

  // 상태
  const [name, setName] = useState(" ");
  const [isActive, setIsActive] = useState(true);
  const [companyPct, setCompanyPct] = useState("0.00");
  const [selfPct, setSelfPct] = useState("0.00");
  const [mlmPct, setMlmPct] = useState("0.00");
  const [companyUserId, setCompanyUserId] = useState("");
  const [mlmReferralPlanId, setMlmReferralPlanId] = useState("");
  const [levelBonusPlanId, setLevelBonusPlanId] = useState("");
  // ⬇️ SSR 중 변하는 값을 직접 넣지 않도록 빈 값으로 시작
  const [effectiveFrom, setEffectiveFrom] = useState<string>("");
  const [effectiveTo, setEffectiveTo] = useState<string>("");

  const isDisabled: boolean = disabled ?? false;

  // 초기값 반영
  useEffect(() => {
    if (props.initial) {
      if (typeof props.initial.name === "string") setName(props.initial.name);
      if (typeof props.initial.isActive === "boolean")
        setIsActive(props.initial.isActive);
      if (typeof props.initial.companyPct === "string")
        setCompanyPct(props.initial.companyPct);
      if (typeof props.initial.selfPct === "string")
        setSelfPct(props.initial.selfPct);
      if (typeof props.initial.mlmPct === "string")
        setMlmPct(props.initial.mlmPct);
      if (typeof props.initial.companyUserId === "string")
        setCompanyUserId(props.initial.companyUserId);
      if (typeof props.initial.mlmReferralPlanId === "string")
        setMlmReferralPlanId(props.initial.mlmReferralPlanId);
      if (typeof props.initial.levelBonusPlanId === "string")
        setLevelBonusPlanId(props.initial.levelBonusPlanId);
      if (typeof props.initial.effectiveFrom === "string")
        setEffectiveFrom(props.initial.effectiveFrom);
      if (typeof props.initial.effectiveTo === "string")
        setEffectiveTo(props.initial.effectiveTo);
    }
  }, [props.initial]);

  // 클라이언트 마운트 후 effectiveFrom이 비어있으면 현재 시각으로 채움
  useEffect(() => {
    if (!props.initial?.effectiveFrom) {
      setEffectiveFrom(new Date().toISOString());
    }
    // props.initial?.effectiveFrom 변경에 따른 재실행은 위 초기값 useEffect가 담당
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검증
  const validationError = useMemo(() => {
    if (name.trim().length === 0) return "이름을 입력해 주세요.";
    if (companyUserId.trim().length === 0)
      return "companyUserId를 입력해 주세요.";
    if (mlmReferralPlanId.trim().length === 0)
      return "mlmReferralPlanId를 입력해 주세요.";
    if (levelBonusPlanId.trim().length === 0)
      return "levelBonusPlanId를 입력해 주세요.";
    if (!effectiveFrom) return "effectiveFrom을 입력해 주세요.";
    return null;
  }, [name, companyUserId, mlmReferralPlanId, levelBonusPlanId, effectiveFrom]);

  const canSubmit = validationError === null && !isDisabled;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const payload: PolicyFormValue = {
      name: name.trim(),
      isActive,
      companyPct: companyPct,
      selfPct: selfPct,
      mlmPct: mlmPct,
      companyUserId,
      mlmReferralPlanId,
      levelBonusPlanId,
      effectiveFrom,
      effectiveTo: effectiveTo.trim().length > 0 ? effectiveTo : undefined,
    };
    await onSubmit(payload);
  }, [
    canSubmit,
    name,
    isActive,
    companyPct,
    selfPct,
    mlmPct,
    companyUserId,
    mlmReferralPlanId,
    levelBonusPlanId,
    effectiveFrom,
    effectiveTo,
    onSubmit,
  ]);

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
                placeholder="Policy name"
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
          <h3 className="card-title text-base">분배 비율(%)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Company %</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={companyPct}
                onChange={(e) => setCompanyPct(e.target.value)}
                placeholder="e.g., 10.00"
                disabled={isDisabled}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Self %</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={selfPct}
                onChange={(e) => setSelfPct(e.target.value)}
                placeholder="e.g., 50.00"
                disabled={isDisabled}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">MLM %</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={mlmPct}
                onChange={(e) => setMlmPct(e.target.value)}
                placeholder="e.g., 40.00"
                disabled={isDisabled}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h3 className="card-title text-base">연결 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Company User ID</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={companyUserId}
                onChange={(e) => setCompanyUserId(e.target.value)}
                placeholder="user id"
                disabled={isDisabled}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">MLM Referral Plan ID</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={mlmReferralPlanId}
                onChange={(e) => setMlmReferralPlanId(e.target.value)}
                placeholder="plan id"
                disabled={isDisabled}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Level Bonus Plan ID</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={levelBonusPlanId}
                onChange={(e) => setLevelBonusPlanId(e.target.value)}
                placeholder="plan id"
                disabled={isDisabled}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <h3 className="card-title text-base">효력 기간</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Effective From (ISO)</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                placeholder="YYYY-MM-DDTHH:mm:ss.sssZ" // ⬅️ 고정 placeholder
                disabled={isDisabled}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Effective To (ISO, optional)</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
                disabled={isDisabled}
              />
            </div>
          </div>
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
