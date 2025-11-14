"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserPackageListResponse } from "@/types/admin/packages/user";
import { useToast } from "@/components/ui";
import { isAbortError, isUserPackageListResponse } from "../guards/user";

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

/** 날짜/숫자 포맷은 뷰에 의존하지 않는 순수 함수로 제공 */
export function fmtNum(v: string | number): string {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toLocaleString("ko-KR") : String(v);
}
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  const HH = `${d.getHours()}`.padStart(2, "0");
  const MM = `${d.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}`;
}

export function useUserPackages(apiUrl: string) {
  const [data, setData] = useState<UserPackageListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const fetchList = useCallback(async () => {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;

    setLoading(true);
    setError(null);
    try {
      const r = await fetch(apiUrl, {
        method: "GET",
        cache: "no-store",
        signal: ac.signal,
      });
      const body = safeParse(await r.text());
      if (!r.ok) throw new Error(`HTTP_${r.status}`);
      if (!isUserPackageListResponse(body)) throw new Error("INVALID_RESPONSE");
      setData(body);
    } catch (e) {
      if (isAbortError(e)) return;
      const msg = toMsg(e);
      setData(null);
      setError(msg);
      toast({ title: "조회 실패", description: msg, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, toast]);

  useEffect(() => {
    void fetchList();
    return () => acRef.current?.abort();
  }, [fetchList]);

  const items = useMemo(() => data?.items ?? [], [data]);

  return { data, items, loading, error, refetch: fetchList };
}
