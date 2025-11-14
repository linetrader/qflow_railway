"use client";

import { useMiningScheduler } from "./hooks/useMiningScheduler";
import ScheduleForm from "./view/ScheduleForm";
import ScheduleTable from "./view/ScheduleTable";

export const dynamic = "force-dynamic";

export default function MiningSchedulerPage() {
  const {
    schedules,
    policies,
    loading,
    error,
    hasPolicy,
    doCreate,
    toggleActive,
    runStop,
    remove,
  } = useMiningScheduler();

  return (
    <main className="p-4 md:p-6 space-y-6">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">마이닝 스케줄러 제어</h1>
            <p className="text-sm opacity-70">
              {loading ? "Loading..." : "Ready"}
              {error ? ` · Error: ${error}` : ""}
            </p>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-title">Schedules</div>
              <div className="stat-value text-primary">
                {schedules ? schedules.length : 0}
              </div>
              <div className="stat-desc">
                {hasPolicy ? "정책 OK" : "정책 없음"}
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

      <ScheduleForm
        policies={policies}
        disabled={loading}
        onSubmit={doCreate}
      />

      <section className="space-y-3">
        <h3 className="font-semibold">스케줄 목록</h3>
        <ScheduleTable
          items={schedules ?? []}
          onToggleActive={toggleActive}
          onRunStop={runStop}
          onDelete={remove}
        />
      </section>
    </main>
  );
}
