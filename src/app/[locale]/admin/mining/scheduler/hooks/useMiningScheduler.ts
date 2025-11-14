"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui";
import {
  type MiningScheduleItem,
  type MiningPolicyItem,
  type CreateScheduleBody,
} from "@/types/admin/mining-scheduler";
import {
  isListResponse,
  isCreateOk,
  isMutateOk,
  isErrorRes,
} from "../guards/mining-scheduler";
import { isAbortError } from "../guards/net";

function safeParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}
function toMsg(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

export function useMiningScheduler() {
  const [schedules, setSchedules] = useState<MiningScheduleItem[] | null>(null);
  const [policies, setPolicies] = useState<MiningPolicyItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    // 이전 요청 취소
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;

    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/mining/scheduler", {
        method: "GET",
        cache: "no-store",
        signal: ac.signal,
      });
      const body = safeParse(await r.text());
      if (!r.ok) {
        const msg = isErrorRes(body) ? body.error : `HTTP_${r.status}`;
        throw new Error(msg);
      }
      if (!isListResponse(body)) {
        throw new Error("INVALID_RESPONSE");
      }
      setSchedules(body.schedules);
      setPolicies(body.policies);
    } catch (e) {
      if (isAbortError(e)) return; // 의도적 취소는 조용히 무시
      setError(toMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    // 언마운트 시 마지막 요청만 취소
    return () => acRef.current?.abort();
  }, [fetchAll]);

  const doCreate = useCallback(
    async (payload: CreateScheduleBody) => {
      try {
        const r = await fetch("/api/admin/mining/scheduler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(payload),
        });
        const body = safeParse(await r.text());
        if (!r.ok || !isCreateOk(body)) {
          const msg = isErrorRes(body) ? body.error : "CREATE_FAILED";
          throw new Error(msg);
        }
        toast({ title: "생성 완료", description: `id=${body.id}` });
        await fetchAll();
      } catch (e) {
        if (isAbortError(e)) return;
        const msg = toMsg(e);
        toast({ title: "생성 실패", description: msg, variant: "error" });
        throw e;
      }
    },
    [fetchAll, toast]
  );

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      try {
        const r = await fetch("/api/admin/mining/scheduler", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ id, isActive }),
        });
        const body = safeParse(await r.text());
        if (!r.ok || !isMutateOk(body)) {
          const msg = isErrorRes(body) ? body.error : "TOGGLE_FAILED";
          throw new Error(msg);
        }
        await fetchAll();
      } catch (e) {
        if (isAbortError(e)) return;
        const msg = toMsg(e);
        toast({ title: "변경 실패", description: msg, variant: "error" });
        throw e;
      }
    },
    [fetchAll, toast]
  );

  const runStop = useCallback(
    async (id: string, currentlyActive: boolean) => {
      try {
        const r = await fetch("/api/admin/mining/scheduler", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ id, currentlyActive }),
        });
        const body = safeParse(await r.text());
        if (!r.ok || !isMutateOk(body)) {
          const msg = isErrorRes(body) ? body.error : "RUNSTOP_FAILED";
          throw new Error(msg);
        }
        await fetchAll();
      } catch (e) {
        if (isAbortError(e)) return;
        const msg = toMsg(e);
        toast({
          title: "실행/중지 실패",
          description: msg,
          variant: "error",
        });
        throw e;
      }
    },
    [fetchAll, toast]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        const r = await fetch("/api/admin/mining/scheduler", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ id }),
        });
        const body = safeParse(await r.text());
        if (!r.ok || !isMutateOk(body)) {
          const msg = isErrorRes(body) ? body.error : "DELETE_FAILED";
          throw new Error(msg);
        }
        await fetchAll();
      } catch (e) {
        if (isAbortError(e)) return;
        const msg = toMsg(e);
        toast({ title: "삭제 실패", description: msg, variant: "error" });
        throw e;
      }
    },
    [fetchAll, toast]
  );

  const hasPolicy = useMemo<boolean>(
    () => Boolean(policies && policies.length > 0),
    [policies]
  );

  return {
    schedules,
    policies,
    loading,
    error,
    hasPolicy,
    fetchAll,
    doCreate,
    toggleActive,
    runStop,
    remove,
  };
}
