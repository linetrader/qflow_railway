// src/app/admin/level/policies/hooks/useLevelPolicies.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  LevelPolicyListItem,
  LevelPolicyListResponse,
} from "@/types/admin/level-policies";

type HookState = {
  loading: boolean;
  error: string | null;
  data: LevelPolicyListItem[] | null;
};

export function useLevelPolicies() {
  const [state, setState] = useState<HookState>({
    loading: true,
    error: null,
    data: null,
  });

  const fetchList = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/admin/level/policies", {
        method: "GET",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as LevelPolicyListResponse;
      setState({ loading: false, error: null, data: json.items });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState({ loading: false, error: msg, data: null });
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const items = useMemo<LevelPolicyListItem[] | null>(
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
