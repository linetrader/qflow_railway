// FILE: /src/app/admin/mining/policies/hooks/useMiningPolicies.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MiningPolicyListItem,
  MiningPolicyListResponse,
} from "@/types/admin/mining-policies";

type HookState = {
  loading: boolean;
  error: string | null;
  data: MiningPolicyListItem[] | null;
};

export function useMiningPolicies() {
  const [state, setState] = useState<HookState>({
    loading: true,
    error: null,
    data: null,
  });

  const fetchList = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const r = await fetch("/api/admin/mining/policies/plans", {
        method: "GET",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(text || `HTTP ${r.status}`);
      }
      const json = (await r.json()) as MiningPolicyListResponse;
      setState({ loading: false, error: null, data: json.items });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState({ loading: false, error: msg, data: null });
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const items = useMemo<MiningPolicyListItem[] | null>(
    () => state.data,
    [state.data]
  );

  return {
    loading: state.loading,
    error: state.error,
    items,
    refetch: fetchList,
  };
}
