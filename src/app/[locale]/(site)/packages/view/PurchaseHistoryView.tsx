// src/app/[locale]/(site)/packages/view/PurchaseHistoryView.tsx
"use client";

import { formatAmount } from "@/lib/format";
import type { ApiHistoryItem } from "@/types/packages";
import { HistoryTable } from "@/components/ui";
import { useTranslations, useFormatter } from "next-intl";

export type PurchaseHistoryViewProps = {
  rows: ApiHistoryItem[];
  total: number;
  nextCursorExists: boolean;
  loading: boolean;
  err: string | null;
  onLoadMore: () => void;
};

export default function PurchaseHistoryView({
  rows,
  total,
  nextCursorExists,
  loading,
  err,
  onLoadMore,
}: PurchaseHistoryViewProps) {
  const t = useTranslations("packages");
  const f = useFormatter();

  const head: readonly string[] = [
    t("history.head.title"),
    t("history.head.date"),
    t("history.head.amount"),
    t("history.head.status"),
  ];

  const tableRows: ReadonlyArray<readonly string[]> = rows.map((h) => {
    const title = t("history.row.title", {
      kind: h.kind,
      units: formatAmount(h.units),
    });
    const date = f.dateTime(new Date(h.date), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const amount = `$${formatAmount(h.units * h.unitPrice)}`;
    const status = h.status;
    return [title, date, amount, status];
  });

  return (
    <section aria-labelledby="history-title" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="history-title" className="text-lg font-semibold">
          {t("history.title")}
        </h2>
        <div className="badge badge-neutral">
          {t("history.totalBadge", { total: formatAmount(total) })}
        </div>
      </div>

      {err ? <div className="mb-2 text-xs text-error">{err}</div> : null}

      {rows.length === 0 ? (
        <div className="px-3 py-4 text-sm opacity-70">{t("history.empty")}</div>
      ) : (
        <HistoryTable
          head={head}
          rows={tableRows}
          emptyLabel={t("history.empty")}
          showIndex={false}
          colAlign={["left", "center", "right", "right"]}
          minColWidthPx={140}
          tableClassName="table-striped table-hover"
        />
      )}

      <div className="mt-3 flex justify-center">
        {nextCursorExists ? (
          <button
            className={`btn btn-outline min-w-28 ${loading ? "loading" : ""}`}
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? t("history.loading") : t("history.loadMore")}
          </button>
        ) : (
          <span className="text-xs opacity-70">{t("history.allLoaded")}</span>
        )}
      </div>
    </section>
  );
}
