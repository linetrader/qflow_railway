"use client";

import { useCallback, useState } from "react";
import type { AdminDetailResult, AdminPostDetail } from "../types";
import { AdminDetailResultSchema } from "../gaurd/announcements";

async function jsonFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      `HTTP ${res.status} ${res.statusText} — non-JSON: ${text.slice(0, 300)}`
    );
  }
  const data = (await res.json()) as unknown;
  return data as T;
}

export function useAnnouncementDetail() {
  const [detail, setDetail] = useState<AdminPostDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await jsonFetch<AdminDetailResult>(
        `/api/admin/boards/announcements?id=${encodeURIComponent(id)}`,
        {
          cache: "no-store",
        }
      );
      const parsed = AdminDetailResultSchema.safeParse(raw);
      if (!parsed.success) throw new Error("INVALID_DETAIL_PAYLOAD");
      if (parsed.data.ok) {
        setDetail(parsed.data.data);
        return true;
      }
      throw new Error(parsed.data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
      setDetail(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setDetail(null);
    setError(null);
  }, []);

  return { detail, loading, error, load, clear };
}
