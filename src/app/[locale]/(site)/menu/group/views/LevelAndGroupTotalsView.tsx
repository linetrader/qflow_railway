// src/app/[locale]/(site)/menu/group/views/LevelAndGroupTotalsView.tsx
"use client";

import type { ApiReferralGroupSummary } from "@/types/team";
import { formatAmount } from "@/lib/format";
import { useTranslations } from "next-intl";

export type LevelAndGroupTotalsViewProps = {
  userLevel: number | null;
  referralGroups: ApiReferralGroupSummary[];
};

export default function LevelAndGroupTotalsView({
  userLevel,
  referralGroups,
}: LevelAndGroupTotalsViewProps) {
  const t = useTranslations("menu.group");
  const hasSummaries = referralGroups.length > 0;

  return (
    <div className="card">
      <div className="card-body">
        {/* 헤더: 제목 + 현재 레벨 배지 */}
        <div className="flex items-center justify-between">
          <h2 id="team-summary-title" className="card-title">
            {t("title")}
          </h2>
          <div className="badge badge-info shrink-0 whitespace-nowrap">
            {t("badges.myLevel", {
              level: userLevel ?? t("labels.levelUnknown"),
            })}
          </div>
        </div>

        <p className="mt-1 text-xs text-base-content/60">
          {t("notes.groupNo")}
        </p>

        {!hasSummaries ? (
          <p className="mt-3 text-sm opacity-70">{t("empty.noData")}</p>
        ) : (
          <div className="list overflow-hidden">
            {/* ── Mobile: 카드형 리스트 ───────────────────────────── */}
            <ul className="block sm:hidden" aria-label={t("aria.mobileList")}>
              {referralGroups.map((g) => (
                <li key={g.groupNo} className="divide px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-lg border bg-base-100 text-xs shrink-0">
                      {g.groupNo}
                    </div>
                    <span className="text-sm">{t("labels.group")}</span>
                    <span className="ml-auto text-[11px] text-base-content/60">
                      {g.updatedAt}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                    <span className="text-[11px] text-base-content/60">
                      {t("labels.salesVolumeUSDT")}
                    </span>
                    <span className="text-right tabular-nums">
                      ${formatAmount(g.salesVolume)}
                    </span>

                    <span className="text-[11px] text-base-content/60">
                      {t("labels.dailyAllowanceDFT")}
                    </span>
                    <span className="text-right tabular-nums">
                      {formatAmount(g.dailyAllowanceDFT)} DFT
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* ── Desktop(≥sm): 테이블 ───────────────────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs">{t("columns.group")}</th>
                    <th className="text-right text-xs">
                      {t("columns.salesVolumeUSDT")}
                    </th>
                    <th className="text-right text-xs">
                      {t("columns.dailyAllowanceDFT")}
                    </th>
                    <th className="text-center text-xs">
                      {t("columns.updatedAt")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referralGroups.map((g) => (
                    <tr key={g.groupNo}>
                      <td className="text-left">
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 place-items-center rounded-lg border bg-base-100 text-xs">
                            {g.groupNo}
                          </div>
                          <span className="text-sm">{t("labels.group")}</span>
                        </div>
                      </td>
                      <td className="text-right whitespace-nowrap tabular-nums">
                        ${formatAmount(g.salesVolume)}
                      </td>
                      <td className="text-right whitespace-nowrap tabular-nums">
                        {formatAmount(g.dailyAllowanceDFT)} DFT
                      </td>
                      <td className="text-center whitespace-nowrap">
                        {g.updatedAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
