// src/app/[locale]/(site)/reward/hooks/useRewardsPage.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAmount } from "@/lib/format";
import {
  type FilterMode,
  type RewardsState,
  type RewardsActions,
  type RewardsDerived,
  type HistoryRowVM,
  type NextCursor,
  isErr,
} from "@/types/reward";
import { useToast } from "@/components/ui/";
import { fetchRewardsPage } from "../lib/api";
import { useTranslations } from "next-intl";

type UseRewardsPageReturn = RewardsState & RewardsActions & RewardsDerived;

const PAGE_SIZE = 10;

export function useRewardsPage(): UseRewardsPageReturn {
  const t = useTranslations("reward");
  const toast = useToast();

  const [mode, setMode] = useState<FilterMode>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<RewardsState["rows"]>([]);
  const [nextCursor, setNextCursor] = useState<NextCursor>(null);
  const [totals, setTotals] = useState<RewardsState["totals"]>({
    totalUSDT: 0,
    dftSummary: null,
  });

  const load = useCallback(
    async (
      m: FilterMode,
      cursor: NextCursor,
      append: boolean
    ): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchRewardsPage({
          filter: m,
          limit: PAGE_SIZE,
          cursor: cursor ?? undefined,
        });

        if (isErr(res)) {
          const msg = res.message ?? res.code ?? t("errors.requestFailed");
          setError(msg);
          toast.error(msg);
          return;
        }

        setMode(res.mode);
        setRows((prev) => (append ? [...prev, ...res.items] : res.items));
        setNextCursor(res.nextCursor);
        setTotals(res.totals);

        if (!append) toast.info(t("toast.refetched"));
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("errors.network");
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [toast, t]
  );

  useEffect(() => {
    void load("ALL", null, false);
  }, [load]);

  const switchMode = useCallback(
    (m: FilterMode): void => {
      if (m === mode) return;
      void load(m, null, false);
    },
    [mode, load]
  );

  const loadMore = useCallback((): void => {
    if (!nextCursor) return;
    void load(mode, nextCursor, true);
  }, [mode, nextCursor, load]);

  const reloadAll = useCallback((): void => {
    void load(mode, null, false);
  }, [mode, load]);

  const tableRows = useMemo<HistoryRowVM[]>(
    () =>
      rows.map((r) => {
        const status = r.type === "USDT" && r.status ? ` · ${r.status}` : "";
        const subtitle = r.subtitle ? ` · ${r.subtitle}` : "";
        const note = `${r.title}${subtitle} · ${formatAmount(r.amount)} ${
          r.unit
        }${status}`;
        return { id: r.id, date: r.date, amount: r.amount, note };
      }),
    [rows]
  );

  const totalCountLabel = useMemo<string>(() => {
    const plus = nextCursor ? "+" : "";
    return t("labels.totalCount", { count: rows.length, plus });
  }, [rows.length, nextCursor, t]);

  return {
    mode,
    loading,
    error,
    rows,
    nextCursor,
    totals,
    switchMode,
    loadMore,
    reloadAll,
    tableRows,
    totalCountLabel,
  };
}
