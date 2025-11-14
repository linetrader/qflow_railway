"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ListResp } from "@/types/admin/packages";
//import { isListResp } from "@/guards/admin-packages";
//import { isAbortError } from "@/guards/net";
import { safeParse, toMsg } from "@/app/[locale]/admin/lib/json";
import { useToast } from "@/components/ui";
import { isListResp } from "@/app/[locale]/admin/packages/guards/packages";
import { isAbortError } from "@/app/[locale]/admin/packages/guards/net";

export function usePackagesList(params: {
  page: number;
  size: number;
  q: string;
}) {
  const { page, size, q } = params;
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("size", String(size));
        if (q.trim()) qs.set("q", q.trim());
        const r = await fetch(`/api/admin/packages?${qs.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const body = safeParse(await r.text());
        if (!r.ok || !isListResp(body))
          throw new Error(r.ok ? "INVALID_RESPONSE" : `HTTP_${r.status}`);
        setData(body);
      } catch (e) {
        if (isAbortError(e)) return;
        const msg = toMsg(e);
        setError(msg);
        setData(null);
        toast({
          title: "목록 로드 실패",
          description: msg,
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [page, size, q, toast]);

  const items = useMemo(() => data?.items ?? [], [data]);
  return { data, items, loading, error };
}
