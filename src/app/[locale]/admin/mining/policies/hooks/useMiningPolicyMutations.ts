// FILE: /src/app/admin/mining/policies/hooks/useMiningPolicyMutations.ts
"use client";

import { useCallback, useState } from "react";
import type {
  MiningPolicyCreateBody,
  MiningPolicyCreateResponse,
  MiningPolicyUpdateBody,
  MiningPolicyUpdateResponse,
  MiningPolicyDeleteResponse,
} from "@/types/admin/mining-policies";

export function useMiningPolicyMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPolicy = useCallback(async (body: MiningPolicyCreateBody) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/mining/policies/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const json = (await r.json()) as MiningPolicyCreateResponse;
      if (!r.ok || !("ok" in json && json.ok)) {
        const msg = "error" in json ? json.error : `HTTP ${r.status}`;
        throw new Error(msg);
      }
      return json.item;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePolicy = useCallback(
    async (id: string, body: MiningPolicyUpdateBody) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/admin/mining/policies/plans/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
        });
        const json = (await r.json()) as MiningPolicyUpdateResponse;
        if (!r.ok || !("ok" in json && json.ok)) {
          const msg = "error" in json ? json.error : `HTTP ${r.status}`;
          throw new Error(msg);
        }
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

  const deletePolicy = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/mining/policies/plans/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      const json = (await r.json()) as MiningPolicyDeleteResponse;
      if (!r.ok || !("ok" in json && json.ok)) {
        const msg = "error" in json ? json.error : `HTTP ${r.status}`;
        throw new Error(msg);
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, createPolicy, updatePolicy, deletePolicy };
}
