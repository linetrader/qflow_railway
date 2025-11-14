// FILE: /src/app/admin/level/policies/hooks/usePolicyMutations.ts
"use client";

import { useCallback, useState } from "react";
import type {
  LevelPolicyCreateBody,
  LevelPolicyCreateResponse,
  LevelPolicyUpdateBody,
  LevelPolicyUpdateResponse,
  LevelPolicyDeleteResponse,
} from "@/types/admin/level-policies";

export function usePolicyMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPolicy = useCallback(async (body: LevelPolicyCreateBody) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/level/policies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const json = (await r.json()) as LevelPolicyCreateResponse;
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
    async (id: string, body: LevelPolicyUpdateBody) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/admin/level/policies/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
        });
        const json = (await r.json()) as LevelPolicyUpdateResponse;
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
      const r = await fetch(`/api/admin/level/policies/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      const json = (await r.json()) as LevelPolicyDeleteResponse;
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
