"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MlmPlanListItem,
  MlmPlanListResponse,
} from "@/types/admin/level-policies/mlm-referral-plans";

type State = {
  loading: boolean;
  error: string | null;
  data: MlmPlanListItem[] | null;
};

export function useMlmPlans() {
  const [s, setS] = useState<State>({ loading: true, error: null, data: null });

  const fetchList = useCallback(async () => {
    setS((x) => ({ ...x, loading: true, error: null }));
    try {
      const r = await fetch("/api/admin/mlm/plans", {
        method: "GET",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
      const json = (await r.json()) as MlmPlanListResponse;
      setS({ loading: false, error: null, data: json.items });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setS({ loading: false, error: msg, data: null });
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const items = useMemo<MlmPlanListItem[] | null>(() => s.data, [s.data]);
  return { loading: s.loading, error: s.error, items, refetch: fetchList };
}
