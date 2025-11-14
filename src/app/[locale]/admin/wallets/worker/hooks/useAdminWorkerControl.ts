// src/app/admin/wallets/worker/hooks/useAdminWorkerControl.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import type {
  ChainRow,
  CfgResp,
  SaveChainResp,
  StResp,
  WorkerStatus,
} from "@/types/admin/wallets/worker";
import { isAbortError } from "@/app/[locale]/admin/lib/fetchWithRetry";

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message ?? "";
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return typeof e === "string" ? e : "UNKNOWN_ERROR";
}

export function useAdminWorkerControl() {
  const [chains, setChains] = useState<ChainRow[]>([]);
  const [status, setStatus] = useState<WorkerStatus | null>(null);

  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  const initCtrl = useRef<AbortController | null>(null);

  useEffect(() => {
    // 이전 요청 중단
    initCtrl.current?.abort();
    const ac = new AbortController();
    initCtrl.current = ac;

    setInitLoading(true);
    setInitError(null);

    (async () => {
      try {
        const [cfg, st] = await Promise.all([
          fetchJson<CfgResp>("/api/admin/wallets/worker/config", {
            signal: ac.signal,
            cache: "no-store",
          }),
          fetchJson<StResp>("/api/admin/wallets/worker", {
            signal: ac.signal,
            cache: "no-store",
          }),
        ]);

        if (cfg.ok) setChains(cfg.rows);
        else setInitError(cfg.message ?? cfg.code ?? "CONFIG_LOAD_FAILED");

        if (st.ok) setStatus(st.status);
        else
          setInitError(
            (prev) => prev ?? st.message ?? st.code ?? "STATUS_LOAD_FAILED"
          );
      } catch (e: unknown) {
        // ✅ StrictMode로 인한 중간 Abort는 표시하지 않음
        if (isAbortError(e)) return;
        setInitError(toMessage(e));
      } finally {
        setInitLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  const saveChain = useCallback(async (row: ChainRow) => {
    setSaving(row.id);
    try {
      const resp = await fetchJson<SaveChainResp>(
        "/api/admin/wallets/worker/config",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        }
      );
      if (!resp.ok) throw new Error(resp.message ?? resp.code ?? "SAVE_FAILED");
      setChains((prev) => prev.map((c) => (c.id === row.id ? resp.row : c)));
    } finally {
      setSaving(null);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchJson<StResp>("/api/admin/wallets/worker", {
        cache: "no-store",
      });
      if (resp.ok) setStatus(resp.status);
    } finally {
      setLoading(false);
    }
  }, []);

  const patchWorker = useCallback(
    async (
      body: Partial<{
        balanceEnabled: boolean;
        sweepEnabled: boolean;
        kickBalance: boolean;
        kickSweep: boolean;
      }>
    ) => {
      setToggling(true);
      try {
        const resp = await fetchJson<{
          ok: boolean;
          message?: string;
          code?: string;
        }>("/api/admin/wallets/worker", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!resp.ok)
          throw new Error(resp.message ?? resp.code ?? "PATCH_FAILED");
        await refreshStatus();
      } finally {
        setToggling(false);
      }
    },
    [refreshStatus]
  );

  return {
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
  };
}
