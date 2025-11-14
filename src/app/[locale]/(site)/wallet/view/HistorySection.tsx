// src/app/[locale]/(site)/wallet/view/HistorySection.tsx
"use client";

import type { Tx } from "@/types/wallet";
import { nfmt } from "@/lib/format";
import { HistoryTable } from "@/components/ui";
import { useTranslations } from "next-intl";

export function HistorySection({
  history,
  hasMore,
  loading,
  onLoadMore,
}: {
  history: Tx[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}) {
  const t = useTranslations("wallet.history");
  const head = t.raw("head") as string[];
  const rows: ReadonlyArray<readonly string[]> = history.map((tx) => [
    `${tx.type} · ${tx.token}`,
    String(tx.date),
    nfmt(tx.amount),
    tx.status,
  ]);

  return (
    <section>
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title">{t("title")}</h2>
            <div className={`badge ${hasMore ? "badge-info" : ""}`}>
              {hasMore
                ? t("recentMore", { count: history.length })
                : t("recent", { count: history.length })}
            </div>
          </div>

          {history.length === 0 ? (
            <p className="text-sm opacity-70">{t("empty")}</p>
          ) : (
            <HistoryTable
              head={head}
              rows={rows}
              emptyLabel={t("empty")}
              showIndex={false}
              colAlign={["left", "center", "right", "center"]}
              minColWidthPx={140}
              tableClassName="table-striped table-hover"
            />
          )}

          <div className="mt-3 flex justify-center">
            {hasMore ? (
              <button
                className={`btn btn-outline ${loading ? "loading" : ""}`}
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading ? t("loading") : t("more")}
              </button>
            ) : (
              <span className="text-[11px] opacity-70">{t("allLoaded")}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
