// src/app/[locale]/(site)/packages/hooks/usePurchaseHistory.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  ApiHistoryItem,
  HistoryResp,
  NextCursor,
  UsePurchaseHistoryResult,
} from "@/types/packages";
import { useTranslations } from "next-intl";

function extractMessage(u: unknown): string | null {
  if (u && typeof u === "object" && u !== null && "message" in u) {
    const m = (u as { message?: unknown }).message;
    return typeof m === "string" ? m : null;
  }
  return null;
}

export function usePurchaseHistory(
  initial: ApiHistoryItem[],
  nextCursorInitial: NextCursor = null
): UsePurchaseHistoryResult {
  const t = useTranslations("packages");

  const [rows, setRows] = useState<ApiHistoryItem[]>(initial);
  const [nextCursor, setNextCursor] = useState<NextCursor>(nextCursorInitial);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const PAGE_SIZE = 30;

  const total = useMemo<number>(
    () => rows.reduce((s, x) => s + x.unitPrice * x.units, 0),
    [rows]
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;

    try {
      setLoading(true);
      setErr(null);

      const usp = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (nextCursor.ts) usp.set("cursorTs", nextCursor.ts);
      if (nextCursor.id) usp.set("cursorId", String(nextCursor.id));

      const r = await fetch(`/api/packages?${usp.toString()}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });

      let data: unknown = null;
      try {
        data = (await r.json()) as unknown;
      } catch {
        data = null;
      }

      if (!r.ok) {
        const message = extractMessage(data) ?? `HTTP ${r.status}`;
        throw new Error(message);
      }

      const j = (data ?? {}) as HistoryResp;
      if (!j.ok) {
        const message =
          typeof j.message === "string" ? j.message : t("errors.unknown");
        throw new Error(message);
      }

      const hist: ApiHistoryItem[] = Array.isArray(j.history) ? j.history : [];
      const cursor: NextCursor = j.nextCursor ?? null;

      setRows((prev) => prev.concat(hist));
      setNextCursor(cursor);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("errors.network");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, t]);

  return { rows, total, nextCursor, loading, err, loadMore };
}
