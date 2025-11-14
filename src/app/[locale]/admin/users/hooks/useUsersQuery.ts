// src/app/admin/users/components/hooks/useUsersQuery.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQS } from "@/app/[locale]/admin/lib/useQS";
import { useDebouncedValue } from "@/app/[locale]/admin/lib/useDebouncedValue";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import { PAGE_SIZES, type UsersApiResp } from "@/types/admin/users";
import { isAbortError } from "../../lib/fetchWithRetry";
// import type { UsersApiResp } from "../../../types/users";
// import { PAGE_SIZES } from "../../../types/users";
// import { isAbortError } from "../../../lib/fetchWithRetry";

export function useUsersQuery() {
  const { searchParams, setParams } = useQS();

  const page = useMemo(
    () => Math.max(1, Number(searchParams?.get("page") ?? 1)),
    [searchParams]
  );
  const pageSize = useMemo(() => {
    const n = Number(searchParams?.get("size") ?? 20);
    return (PAGE_SIZES as readonly number[]).includes(n) ? n : 20;
  }, [searchParams]);
  const sort = searchParams?.get("sort") ?? "createdAt:desc";
  const qRaw = searchParams?.get("q") ?? "";

  const [pendingQ, setPendingQ] = useState(qRaw);
  const q = useDebouncedValue(pendingQ, 400);

  const [data, setData] = useState<UsersApiResp | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevQRef = useRef(q);
  useEffect(() => {
    const nextPage = prevQRef.current !== q ? 1 : page;
    setParams({ q: q || null, page: nextPage, size: pageSize, sort });
    prevQRef.current = q;
  }, [q, page, pageSize, sort, setParams]);

  const ctrlRef = useRef<AbortController | null>(null);
  useEffect(() => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          size: String(pageSize),
          sort,
        });
        if (q) qs.set("q", q);

        const res = await fetchJson<UsersApiResp>(
          `/api/admin/users?${qs.toString()}`,
          { signal: ctrl.signal, cache: "no-store" }
        );
        setData(res);
      } catch (e: unknown) {
        if (!isAbortError(e)) {
          setError(e instanceof Error ? e.message : "UNKNOWN_ERROR");
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [page, pageSize, sort, q]);

  const onPageChange = (p: number) => setParams({ page: p });
  const onPageSizeChange = (s: number) => setParams({ size: s, page: 1 });
  const onSortChange = (v: string) => setParams({ sort: v, page: 1 });

  return {
    data,
    loading,
    error,
    page,
    pageSize,
    sort,
    q,
    pendingQ,
    setPendingQ,
    onPageChange,
    onPageSizeChange,
    onSortChange,
  };
}
