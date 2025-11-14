// src/app/[locale]/(site)/reward/views/HistoryView.tsx
"use client";

import React, { useId } from "react";
import { formatAmount } from "@/lib/format";
import type { FilterMode, HistoryRowVM, NextCursor } from "@/types/reward";
import { HistoryTable } from "@/components/ui";
import { useTranslations } from "next-intl";

type Props = {
  mode: FilterMode;
  tableRows: HistoryRowVM[];
  nextCursor: NextCursor;
  loading: boolean;
  totalCountLabel: string;
  onSwitch: (m: FilterMode) => void;
  onLoadMore: () => void;
};

export default function HistoryView({
  mode,
  tableRows,
  nextCursor,
  loading,
  totalCountLabel,
  onSwitch,
  onLoadMore,
}: Props) {
  const t = useTranslations("reward");
  const tabsId = useId();
  const tabName = `reward_tabs_${tabsId}`;
  const modes: readonly FilterMode[] = ["ALL", "USDT", "DFT"] as const;

  const head: readonly string[] = [
    t("history.head.title"),
    t("history.head.date"),
    t("history.head.amount"),
  ];
  const rows: ReadonlyArray<readonly string[]> = tableRows.map((r) => [
    String(r.note),
    String(r.date),
    formatAmount(r.amount),
  ]);

  return (
    <section>
      <div className="card">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base">{t("history.title")}</h2>
            <div className="badge badge-neutral">{totalCountLabel}</div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full">
              <div className="tabs tabs-lift">
                {modes.map((m) => (
                  <React.Fragment key={m}>
                    <input
                      type="radio"
                      name={tabName}
                      className="tab"
                      aria-label={t(`history.modes.${m}`)}
                      checked={mode === m}
                      onChange={() => onSwitch(m)}
                    />
                    <div className="tab-content bg-base-100 border-base-300 p-4 sm:p-6">
                      {mode === m ? (
                        <HistoryTable
                          head={head}
                          rows={rows}
                          emptyLabel={t("history.empty")}
                          showIndex={false}
                          colAlign={["left", "center", "right"]}
                          minColWidthPx={150}
                          tableClassName="table-striped table-hover"
                        />
                      ) : null}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-center">
            {nextCursor ? (
              <button
                className={`btn btn-outline ${loading ? "loading" : ""}`}
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading ? t("history.loading") : t("history.loadMore")}
              </button>
            ) : (
              <span className="text-[11px] text-base-content/60">
                {t("history.allLoaded")}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
