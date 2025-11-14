// src/app/admin/boards/announcements/hooks/useAnnouncementsList.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminListResult, AdminPostListItem } from "../types";
import { AdminListResultSchema } from "../gaurd/announcements";

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

export function useAnnouncementsList() {
  const [list, setList] = useState<AdminPostListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await jsonFetch<AdminListResult>(
        "/api/admin/boards/announcements",
        { cache: "no-store" }
      );
      const parsed = AdminListResultSchema.safeParse(raw);
      if (!parsed.success) throw new Error("INVALID_LIST_PAYLOAD");
      if (parsed.data.ok) setList(parsed.data.data);
      else throw new Error(parsed.data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { list, loading, error, refresh };
}
