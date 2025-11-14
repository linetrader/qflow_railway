"use client";

import { useEffect, useRef, useState } from "react";
import type { PackageDetail } from "@/types/admin/packages";
import { safeParse, toMsg } from "@/app/[locale]/admin/lib/json";
import { useToast } from "@/components/ui";
import { isDetailResp } from "@/app/[locale]/admin/packages/guards/packages";
import { isAbortError } from "@/app/[locale]/admin/packages/guards/net";

export function usePackageDetail(id: string | null) {
  const [item, setItem] = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/admin/packages/${id}`, {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const body = safeParse(await r.text());
        if (!r.ok || !isDetailResp(body))
          throw new Error(r.ok ? "INVALID_RESPONSE" : `HTTP_${r.status}`);
        setItem(body.item);
      } catch (e) {
        if (isAbortError(e)) return;
        const msg = toMsg(e);
        setError(msg);
        setItem(null);
        toast({
          title: "상세 로드 실패",
          description: msg,
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [id, toast]);

  return { item, loading, error };
}
