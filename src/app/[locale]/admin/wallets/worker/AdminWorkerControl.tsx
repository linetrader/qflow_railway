// src/app/admin/wallets/worker/AdminWorkerControl.tsx
"use client";

import { useAdminWorkerControl } from "./hooks/useAdminWorkerControl";
import WorkerStatusView from "./view/WorkerStatusView";
import ChainRowView from "./view/ChainRowView";
import SystemKvView from "./view/SystemKvView";
import { useToast } from "@/components/ui";

export default function AdminWorkerControl() {
  const {
    state: {
      chains,
      status,
      initLoading,
      initError,
      saving,
      loading,
      toggling,
    },
    actions: { saveChain, refreshStatus, patchWorker },
  } = useAdminWorkerControl();
  const { toast } = useToast();

  return (
    <div className="space-y-8">
      {initLoading && (
        <div className="alert">
          <span>설정을 불러오는 중…</span>
        </div>
      )}
      {initError && (
        <div className="alert alert-error">
          <span>{initError}</span>
        </div>
      )}

      <SystemKvView />

      <WorkerStatusView
        status={status}
        loading={loading}
        toggling={toggling}
        onRefresh={() => refreshStatus()}
        onToggle={(p) => {
          return patchWorker(p).catch((e) => {
            toast({
              title: "변경 실패",
              description: String(e),
              variant: "error",
            });
          });
        }}
        onKick={(which) => {
          return patchWorker(
            which === "balance" ? { kickBalance: true } : { kickSweep: true }
          ).catch((e) => {
            toast({
              title: "요청 실패",
              description: String(e),
              variant: "error",
            });
          });
        }}
      />

      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              체인별 설정(AdminChainConfig)
            </h2>
            <button className="btn btn-ghost" onClick={() => location.reload()}>
              전체 새로고침
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {chains.map((c) => (
              <ChainRowView
                key={c.id}
                row={c}
                saving={saving === c.id}
                onSave={async (r) => {
                  try {
                    await saveChain(r);
                    // 성공 토스트는 ChainRowView 내부에서 처리
                  } catch (e) {
                    // 여기서 반환값을 만들지 않으면 Promise<void> 유지
                    toast({
                      title: "저장 실패",
                      description: String(e),
                      variant: "error",
                    });
                  }
                }}
              />
            ))}
            {chains.length === 0 && (
              <p className="text-sm opacity-60">등록된 체인 설정이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
