// src/app/admin/level/worker/view/LevelWorkerForm.tsx
"use client";

import type { Config } from "@/types/admin/level-worker";

type Handlers = {
  onNumChange: <K extends keyof Config>(
    k: K
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStrChange: <K extends keyof Config>(
    k: K
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBoolChange: <K extends keyof Config>(
    k: K
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function LevelWorkerForm(props: {
  merged: Config;
  handlers: Handlers;
  onSubmit: () => void;
  saving: boolean;
}) {
  const { merged, handlers, onSubmit, saving } = props;
  const { onNumChange, onStrChange, onBoolChange } = handlers;

  return (
    <form
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {/* 기본 */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">기본</h3>
          <div className="form-control">
            <label className="label cursor-pointer gap-2">
              <span className="label-text">활성화</span>
              <input
                type="checkbox"
                className="toggle"
                checked={merged.isActive}
                onChange={onBoolChange("isActive")}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="form-control">
            <span className="label-text">mode</span>
            <input
              type="text"
              className="input input-bordered"
              value={merged.mode}
              onChange={onStrChange("mode")}
            />
          </label>

          <label className="form-control">
            <span className="label-text">workerId</span>
            <input
              type="text"
              className="input input-bordered"
              value={merged.workerId}
              onChange={onStrChange("workerId")}
            />
          </label>

          <label className="form-control">
            <span className="label-text">logLevel</span>
            <input
              type="text"
              className="input input-bordered"
              value={merged.logLevel}
              onChange={onStrChange("logLevel")}
            />
          </label>

          <label className="form-control sm:col-span-2 lg:col-span-3">
            <span className="label-text">
              stopAtUserId (빈 값 또는 null은 비활성)
            </span>
            <input
              type="text"
              className="input input-bordered"
              value={merged.stopAtUserId ?? ""}
              onChange={onStrChange("stopAtUserId" as keyof Config)}
              placeholder="예: admin"
            />
          </label>
        </div>
      </div>

      {/* 주기/배치 */}
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">주기 / 배치</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NumberInput
            label="intervalMs"
            value={merged.intervalMs}
            onChange={onNumChange("intervalMs")}
            min={0}
          />
          <NumberInput
            label="burstRuns"
            value={merged.burstRuns}
            onChange={onNumChange("burstRuns")}
            min={0}
          />
          <NumberInput
            label="batchSize"
            value={merged.batchSize}
            onChange={onNumChange("batchSize")}
            min={1}
          />
          <NumberInput
            label="fetchLimit"
            value={merged.fetchLimit}
            onChange={onNumChange("fetchLimit")}
            min={1}
          />
        </div>
      </div>

      {/* 타임아웃/수명 */}
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">타임아웃 / 수명</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NumberInput
            label="stallMs"
            value={merged.stallMs}
            onChange={onNumChange("stallMs")}
            min={0}
          />
          <NumberInput
            label="maxAgeMs"
            value={merged.maxAgeMs}
            onChange={onNumChange("maxAgeMs")}
            min={0}
          />
        </div>
      </div>

      {/* 러너/리스 상수 */}
      <div className="card p-4 space-y-3 md:col-span-2">
        <h3 className="font-semibold">러너 / 리스 상수</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NumberInput
            label="maxChainDepth"
            value={merged.maxChainDepth}
            onChange={onNumChange("maxChainDepth")}
            min={1}
          />
          <NumberInput
            label="heartbeatEverySteps"
            value={merged.heartbeatEverySteps}
            onChange={onNumChange("heartbeatEverySteps")}
            min={1}
          />
          <NumberInput
            label="rescueGraceSec"
            value={merged.rescueGraceSec}
            onChange={onNumChange("rescueGraceSec")}
            min={0}
          />
          <TextInput
            label="leaseExpiredError"
            value={merged.leaseExpiredError}
            onChange={onStrChange("leaseExpiredError")}
          />
        </div>
      </div>

      {/* 액션 */}
      <div className="md:col-span-2 flex justify-end gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "저장"}
        </button>
      </div>
    </form>
  );
}

function NumberInput(props: {
  label: string;
  value: number;
  min?: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const { label, value, min, onChange } = props;
  return (
    <label className="form-control">
      <span className="label-text">{label}</span>
      <input
        type="number"
        className="input input-bordered"
        value={Number.isFinite(value) ? value : 0}
        min={typeof min === "number" ? min : undefined}
        onChange={onChange}
      />
    </label>
  );
}

function TextInput(props: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const { label, value, onChange } = props;
  return (
    <label className="form-control">
      <span className="label-text">{label}</span>
      <input
        type="text"
        className="input input-bordered"
        value={value}
        onChange={onChange}
      />
    </label>
  );
}
