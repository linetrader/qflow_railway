// src/app/[locale]/(site)/reward/views/SummaryView.tsx
"use client";

import React from "react";
import { formatAmount } from "@/lib/format";
import { AssetCard } from "@/components/ui/data/AssetCard";
import { useTranslations } from "next-intl";

type Props = {
  totalUSDT: number;
  dftSummary: {
    totalDFT: number;
    todayDFT: number;
    yesterdayDFT: number;
    calculatedAt: string;
  } | null;
};

export default function SummaryView({ totalUSDT, dftSummary }: Props) {
  const t = useTranslations("reward");
  const fmtUSDT = (n: number): string => `${formatAmount(n)}`;
  const fmtDFT = (n: number): string => `${formatAmount(n)}`;

  return (
    <section className="mb-4">
      {/* USDT */}
      <div className="card mb-4">
        <div className="card-body p-4">
          <h2 className="card-title text-base">{t("summary.usdt.title")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AssetCard
              code={t("summary.codes.total")}
              name=""
              amount={totalUSDT}
              badge="neutral"
              formatAmount={fmtUSDT}
            />
          </div>
        </div>
      </div>

      {/* DFT */}
      <div className="card">
        <div className="card-body p-4">
          <h2 className="card-title text-base">{t("summary.dft.title")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AssetCard
              code={t("summary.codes.total")}
              name=""
              amount={dftSummary?.totalDFT ?? 0}
              badge="neutral"
              formatAmount={fmtDFT}
            />
            <AssetCard
              code={t("summary.codes.today")}
              name=""
              amount={dftSummary?.todayDFT ?? 0}
              badge="success"
              formatAmount={fmtDFT}
            />
            <AssetCard
              code={t("summary.codes.yesterday")}
              name=""
              amount={dftSummary?.yesterdayDFT ?? 0}
              badge="info"
              formatAmount={fmtDFT}
            />
          </div>

          <p className="mt-2 text-[11px] text-base-content/60">
            {t("summary.calculatedAt")}: {dftSummary?.calculatedAt ?? "-"}
          </p>
        </div>
      </div>
    </section>
  );
}
