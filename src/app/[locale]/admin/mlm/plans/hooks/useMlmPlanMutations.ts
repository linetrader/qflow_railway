"use client";
import { useCallback, useState } from "react";
import type {
  MlmPlanCreateBody,
  MlmPlanCreateResponse,
  MlmPlanUpdateBody,
  MlmPlanUpdateResponse,
  MlmPlanDeleteResponse,
} from "@/types/admin/level-policies/mlm-referral-plans";

export function useMlmPlanMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPlan = useCallback(async (body: MlmPlanCreateBody) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/mlm/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const json = (await r.json()) as MlmPlanCreateResponse;
      if (!r.ok || !json.ok)
        throw new Error("error" in json ? json.error : `HTTP ${r.status}`);
      return json.item;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePlan = useCallback(
    async (id: string, body: MlmPlanUpdateBody) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/admin/mlm/plans/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
        });
        const json = (await r.json()) as MlmPlanUpdateResponse;
        if (!r.ok || !json.ok)
          throw new Error("error" in json ? json.error : `HTTP ${r.status}`);
        return json.item;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deletePlan = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/mlm/plans/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      const json = (await r.json()) as MlmPlanDeleteResponse;
      if (!r.ok || !json.ok)
        throw new Error("error" in json ? json.error : `HTTP ${r.status}`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, createPlan, updatePlan, deletePlan };
}
