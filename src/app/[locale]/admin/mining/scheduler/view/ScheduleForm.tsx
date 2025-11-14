"use client";

import { useMemo, useRef } from "react";
import type {
  MiningPolicyItem,
  CreateScheduleBody,
} from "@/types/admin/mining-scheduler";

type Props = {
  policies: MiningPolicyItem[] | null;
  disabled: boolean;
  onSubmit: (payload: CreateScheduleBody) => void | Promise<void>;
};

export default function ScheduleForm(props: Props) {
  const { policies, disabled, onSubmit } = props;
  const formRef = useRef<HTMLFormElement | null>(null);
  const noPolicy = useMemo<boolean>(
    () => !(policies && policies.length > 0),
    [policies]
  );

  return (
    <div className="card p-4 space-y-4">
      <h3 className="font-semibold">스케줄 추가</h3>

      {noPolicy && (
        <div className="alert alert-warning">
          <span>
            * 활성화된 정책이 없습니다. 정책을 먼저 생성/활성화 하세요.
          </span>
        </div>
      )}

      <form
        ref={formRef}
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const kind =
            (fd.get("kind") as string) === "DAILY" ? "DAILY" : "INTERVAL";
          const dows = fd.getAll("dow").map(String);
          const mask = buildDaysOfWeekMask(dows);

          const payload: CreateScheduleBody = {
            name: ((fd.get("name") as string) || "").trim() || null,
            policyId: (fd.get("policyId") as string) || "",
            isActive: fd.get("isActive") === "on",
            kind,
            intervalMinutes:
              kind === "INTERVAL"
                ? toInt(fd.get("intervalMinutes"), null)
                : null,
            dailyAtMinutes:
              kind === "DAILY" ? toInt(fd.get("dailyAtMinutes"), null) : null,
            timezone:
              kind === "DAILY"
                ? (fd.get("timezone") as string) || "Asia/Seoul"
                : null,
            daysOfWeekMask: kind === "DAILY" ? mask : null,
          };
          await onSubmit(payload);
          formRef.current?.reset();
        }}
      >
        {/* 기본 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="form-control">
            <span className="label-text">이름</span>
            <input
              name="name"
              type="text"
              className="input input-bordered"
              placeholder="예) 매일 10:00 실행"
              disabled={disabled}
            />
          </label>

          <label className="form-control">
            <span className="label-text">정책</span>
            <select
              name="policyId"
              className="select select-bordered"
              defaultValue={policies && policies[0] ? policies[0].id : ""}
              disabled={disabled || noPolicy}
            >
              {(policies ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? p.id}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control">
            <span className="label-text">활성화</span>
            <input
              name="isActive"
              type="checkbox"
              className="toggle"
              defaultChecked
              disabled={disabled}
            />
          </label>

          <label className="form-control">
            <span className="label-text">종류</span>
            <select
              name="kind"
              className="select select-bordered"
              defaultValue="INTERVAL"
              disabled={disabled}
            >
              <option value="INTERVAL">간격 실행</option>
              <option value="DAILY">일별 실행</option>
            </select>
          </label>
        </div>

        {/* INTERVAL */}
        <div className="card p-4 space-y-3">
          <h4 className="font-medium">간격 실행 설정</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="form-control">
              <span className="label-text">간격(분, 1분 이상 권장)</span>
              <input
                name="intervalMinutes"
                type="number"
                className="input input-bordered"
                placeholder="예) 10"
                min={0}
                disabled={disabled}
              />
            </label>
          </div>
        </div>

        {/* DAILY */}
        <div className="card p-4 space-y-3">
          <h4 className="font-medium">일별 실행 설정</h4>
          <p className="text-sm opacity-70">
            미선택 시 기본값(매일, 127)로 저장됩니다.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="form-control">
              <span className="label-text">
                실행 시각(분, 0~1439) — 예: 10:30 → 630
              </span>
              <input
                name="dailyAtMinutes"
                type="number"
                className="input input-bordered"
                placeholder="예) 630"
                min={0}
                max={1439}
                disabled={disabled}
              />
            </label>
            <label className="form-control">
              <span className="label-text">시간대(IANA)</span>
              <input
                name="timezone"
                type="text"
                className="input input-bordered"
                defaultValue="Asia/Seoul"
                disabled={disabled}
              />
            </label>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((v) => (
              <label key={v} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  name="dow"
                  value={v}
                  defaultChecked
                  disabled={disabled}
                />
                <span>{"일월화수목금토"[v]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={disabled}>
            스케줄 생성
          </button>
        </div>
      </form>
    </div>
  );
}

function toInt(v: unknown, fallback: number | null): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function buildDaysOfWeekMask(dows: string[]): number {
  if (!dows || dows.length === 0) return 127;
  let mask = 0;
  for (const s of dows) {
    const d = Number(s);
    if (Number.isInteger(d) && d >= 0 && d <= 6) mask |= 1 << d;
  }
  return mask || 127;
}
