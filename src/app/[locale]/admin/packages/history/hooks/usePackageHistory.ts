// src/app/admin/packages/history/hooks/usePackageHistory.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import { useQS } from "@/app/[locale]/admin/lib/useQS";
import type { PackageHistoryListResponse } from "@/types/admin/packages/history";
import { isHistoryList } from "../guards/history";

function pickNumber(...candidates: unknown[]): number {
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (typeof c === "string" && c.trim() !== "") {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

export function usePackageHistory() {
  const { searchParams, setParams } = useQS();

  const page = useMemo(
    () => Math.max(1, Number(searchParams?.get("page") ?? 1)),
    [searchParams]
  );
  const pageSize = useMemo(() => {
    const n = Number(searchParams?.get("pageSize") ?? 20);
    return [10, 20, 50, 100, 200].includes(n) ? n : 20;
  }, [searchParams]);

  const qs = useMemo(() => searchParams?.toString() ?? "", [searchParams]);
  const apiUrl = useMemo(
    () => `/api/admin/packages/history${qs ? `?${qs}` : ""}`,
    [qs]
  );

  const [data, setData] = useState<PackageHistoryListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const acRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async () => {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const json = await fetchJson<unknown>(apiUrl, {
        signal: ac.signal,
        cache: "no-store",
      });
      if (!isHistoryList(json)) throw new Error("INVALID_RESPONSE");
      setData(json);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "UNKNOWN_ERROR");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void fetchAll();
    return () => acRef.current?.abort();
  }, [fetchAll]);

  const onPageChange = (next: number) => setParams({ page: next });
  const onPageSizeChange = (next: number) =>
    setParams({ pageSize: next, page: 1 });

  return {
    page,
    pageSize,
    data,
    loading,
    error,
    pickNumber,
    onPageChange,
    onPageSizeChange,
  };
}
