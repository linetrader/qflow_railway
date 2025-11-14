// src/app/admin/level/worker/hooks/useLevelWorker.ts
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { fetchConfig, putConfig } from "../api";
// import type { Config } from "@/types/admin-level-worker";
//import { isAbortError } from "../../lib/fetchWithRetry";
import { useToast } from "@/components/ui";
import type { Config } from "@/types/admin/level-worker";
import { isAbortError } from "@/app/[locale]/admin/lib/fetchWithRetry";

/** 객체 판별 유틸 */
function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null;
}

/** 에러 직렬화 */
function serializeError(e: unknown): string {
  try {
    if (e instanceof Error) return `${e.name}: ${e.message}`;
    if (typeof DOMException !== "undefined" && e instanceof DOMException) {
      return `${e.name || "DOMException"}: ${e.message || ""}`;
    }
    if (isRecord(e)) return JSON.stringify(e);
    return String(e);
  } catch {
    return "UNKNOWN_ERROR";
  }
}

export function useLevelWorker() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [draft, setDraft] = useState<Partial<Config>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // 초기/재로딩
  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);

    fetchConfig(ac.signal)
      .then((c) => setCfg(c))
      .catch((e: unknown) => {
        if (isAbortError(e)) return;
        setError(serializeError(e));
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  // cfg + draft 병합
  const merged = useMemo<Config | null>(() => {
    if (!cfg) return null;
    return { ...cfg, ...draft };
  }, [cfg, draft]);

  // 필드 설정기
  const setField = useCallback(<K extends keyof Config>(k: K, v: Config[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  }, []);

  // 입력 핸들러
  const onNumChange = useCallback(
    <K extends keyof Config>(k: K) =>
      (e: ChangeEvent<HTMLInputElement>) => {
        const n = Number(e.target.value);
        setField(k, (Number.isFinite(n) ? n : 0) as Config[K]);
      },
    [setField]
  );

  const onStrChange = useCallback(
    <K extends keyof Config>(k: K) =>
      (e: ChangeEvent<HTMLInputElement>) => {
        setField(k, e.target.value as Config[K]);
      },
    [setField]
  );

  const onBoolChange = useCallback(
    <K extends keyof Config>(k: K) =>
      (e: ChangeEvent<HTMLInputElement>) => {
        setField(k, e.target.checked as Config[K]);
      },
    [setField]
  );

  // 저장
  const save = useCallback(async () => {
    if (!merged) return;
    setSaving(true);
    setError(null);

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 30_000);

    try {
      const changed = Object.fromEntries(
        (Object.keys(draft) as Array<keyof Config>).map((k) => [k, draft[k]])
      );
      const updated = await putConfig(changed, ac.signal);
      setCfg(updated);
      setDraft({});
      toast({
        title: "Saved",
        description: "Worker configuration has been updated.",
      });
    } catch (e: unknown) {
      if (!isAbortError(e)) {
        const msg = serializeError(e);
        setError(msg);
        toast({
          title: "Save failed",
          description: msg,
          variant: "error",
        });
      }
    } finally {
      clearTimeout(timeout);
      ac.abort();
      setSaving(false);
    }
  }, [draft, merged, toast]);

  return {
    cfg,
    merged,
    loading,
    saving,
    error,
    onNumChange,
    onStrChange,
    onBoolChange,
    save,
  };
}
