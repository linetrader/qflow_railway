// src/app/[locale]/(site)/reward/page.tsx
"use client";

import React, { memo, useMemo, useState } from "react";
import SummaryView from "./views/SummaryView";
import HistoryView from "./views/HistoryView";
import { useRewardsPage } from "./hooks/useRewardsPage";
import type { FilterMode, HistoryRowVM, NextCursor } from "@/types/reward";
import { useTranslations } from "next-intl";

export default function RewardsPage() {
  const t = useTranslations("reward");
  const { loading, error, rows, nextCursor, totals, loadMore } =
    useRewardsPage();

  const summaryProps = useMemo(() => {
    const totalUSDT = totals.totalUSDT;
    const dftTotal = totals.dftSummary?.totalDFT ?? 0;
    const dftToday = totals.dftSummary?.todayDFT ?? 0;
    const dftYesterday = totals.dftSummary?.yesterdayDFT ?? 0;
    const dftCalculatedAt = totals.dftSummary?.calculatedAt ?? "";
    return { totalUSDT, dftTotal, dftToday, dftYesterday, dftCalculatedAt };
  }, [
    totals.totalUSDT,
    totals.dftSummary?.totalDFT,
    totals.dftSummary?.todayDFT,
    totals.dftSummary?.yesterdayDFT,
    totals.dftSummary?.calculatedAt,
  ]);

  return (
    <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24">
      {loading && rows.length === 0 ? (
        <p className="text-sm text-base-content/60">{t("loading.loading")}</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : (
        <>
          <SummaryPane
            totalUSDT={summaryProps.totalUSDT}
            dftTotal={summaryProps.dftTotal}
            dftToday={summaryProps.dftToday}
            dftYesterday={summaryProps.dftYesterday}
            dftCalculatedAt={summaryProps.dftCalculatedAt}
          />
          <HistoryPane
            initialMode="ALL"
            rows={rows}
            nextCursor={nextCursor}
            loading={loading}
            onLoadMore={loadMore}
          />
        </>
      )}
    </main>
  );
}

type SummaryPaneProps = {
  totalUSDT: number;
  dftTotal: number;
  dftToday: number;
  dftYesterday: number;
  dftCalculatedAt: string;
};

const SummaryPane = memo(function SummaryPane({
  totalUSDT,
  dftTotal,
  dftToday,
  dftYesterday,
  dftCalculatedAt,
}: SummaryPaneProps) {
  return (
    <SummaryView
      totalUSDT={totalUSDT}
      dftSummary={{
        totalDFT: dftTotal,
        todayDFT: dftToday,
        yesterdayDFT: dftYesterday,
        calculatedAt: dftCalculatedAt,
      }}
    />
  );
});

type UnifiedLike = {
  id: string;
  date?: string | number | Date;
  amount?: number;
  token?: "USDT" | "DFT";
  note?: string;
  title?: string;
  memo?: string;
  description?: string;
};

function HistoryPane(props: {
  initialMode: FilterMode;
  rows: UnifiedLike[];
  nextCursor: NextCursor;
  loading: boolean;
  onLoadMore: () => void;
}) {
  const { initialMode, rows, nextCursor, loading, onLoadMore } = props;
  const [mode, setMode] = useState<FilterMode>(initialMode);

  const normalizedRows: HistoryRowVM[] = useMemo(() => {
    const toDateString = (d: string | number | Date | undefined): string => {
      if (typeof d === "string") return d;
      if (typeof d === "number") return new Date(d).toISOString();
      if (d instanceof Date) return d.toISOString();
      return "";
    };
    const toNote = (r: UnifiedLike): string => {
      if (r.note && r.note.trim().length > 0) return r.note;
      if (r.title && r.title.trim().length > 0) return r.title;
      if (r.memo && r.memo.trim().length > 0) return r.memo;
      if (r.description && r.description.trim().length > 0)
        return r.description;
      return "";
    };
    const toAmount = (n: number | undefined): number =>
      typeof n === "number" ? n : 0;

    return rows.map<HistoryRowVM>((r) => ({
      id: r.id,
      note: toNote(r),
      date: toDateString(r.date),
      amount: toAmount(r.amount),
    }));
  }, [rows]);

  const getCurrency = (
    r: UnifiedLike | HistoryRowVM
  ): "USDT" | "DFT" | null => {
    if ("token" in r && (r as UnifiedLike).token) {
      const tk = (r as UnifiedLike).token;
      if (tk === "USDT" || tk === "DFT") return tk;
    }
    const note = "note" in r && r.note ? r.note : "";
    if (note.includes("[USDT]")) return "USDT";
    if (note.includes("[DFT]")) return "DFT";
    return null;
  };

  const tableRows = useMemo(() => {
    if (mode === "ALL") return normalizedRows;
    return normalizedRows.filter((r) => getCurrency(r) === mode);
  }, [normalizedRows, mode]);

  const totalCountLabel = useMemo(
    () => `총 ${tableRows.length}건`,
    [tableRows.length]
  );

  return (
    <HistoryView
      mode={mode}
      tableRows={tableRows}
      nextCursor={nextCursor}
      loading={loading}
      totalCountLabel={totalCountLabel}
      onSwitch={setMode}
      onLoadMore={onLoadMore}
    />
  );
}
