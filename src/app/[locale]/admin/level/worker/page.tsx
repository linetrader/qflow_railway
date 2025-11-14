// src/app/admin/level/worker/page.tsx
"use client";

import { useLevelWorker } from "./hooks/useLevelWorker";
import LevelWorkerForm from "./view/LevelWorkerForm";

export default function LevelWorkerPage() {
  const {
    merged,
    loading,
    saving,
    error,
    onNumChange,
    onStrChange,
    onBoolChange,
    save,
  } = useLevelWorker();

  return (
    <main className="p-4 md:p-6 space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Level Worker 설정</h1>
            <p className="text-sm opacity-70">
              {merged ? `key: ${merged.key}` : ""}
            </p>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-title">Status</div>
              <div className="stat-value text-primary">
                {loading ? "Loading" : "Ready"}
              </div>
              <div className="stat-desc">
                {saving ? "Saving..." : error ? "Error" : "OK"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {loading && !merged && (
        <div className="alert">
          <span>불러오는 중…</span>
        </div>
      )}

      {merged && (
        <LevelWorkerForm
          merged={merged}
          handlers={{ onNumChange, onStrChange, onBoolChange }}
          onSubmit={save}
          saving={saving}
        />
      )}
    </main>
  );
}
