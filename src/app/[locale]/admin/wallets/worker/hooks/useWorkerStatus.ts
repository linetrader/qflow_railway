// src/app/admin/wallets/worker/hooks/useWorkerStatus.ts
"use client";

import { useCallback, useState } from "react";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import type {
  PatchResp,
  StResp,
  WorkerStatus,
} from "@/types/admin/wallets/worker";

function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message ?? "";
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return typeof e === "string" ? e : "UNKNOWN_ERROR";
}

export function useWorkerStatus() {
  const [status, setStatus] = useState<WorkerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  const refresh = useCallback(async () => {
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

  const patch = useCallback(
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
        const resp = await fetchJson<PatchResp>("/api/admin/wallets/worker", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!resp.ok) throw new Error("PATCH_FAILED");
        await refresh();
      } catch (e: unknown) {
        throw new Error(toMessage(e));
      } finally {
        setToggling(false);
      }
    },
    [refresh]
  );

  return { status, loading, toggling, refresh, patch };
}
