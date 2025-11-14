// src/app/[locale]/(site)/(home)/views/HomeView.tsx
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { formatAmount, formatDate } from "../shared/format";
import type { UseHomeDataReturn } from "../hooks/useHomeData";
import { AssetCard, HistoryTable } from "@/components/ui";

export type HomeViewProps = UseHomeDataReturn;

const formatDateAdapter: (d: string | Date) => string = (d) =>
  formatDate(typeof d === "string" ? d : d.toISOString());

export function HomeView({
  loading,
  err,
  authed,
  balances,
  rewardHistory,
  packageHistory,
  announcementsTop,
}: HomeViewProps) {
  const t = useTranslations("home");

  const viewCount = 5;
  const rewardTop = rewardHistory.slice(0, viewCount);
  const packageTop = packageHistory.slice(0, viewCount);

  const rewardCountText = t("reward.recentCount", {
    count: Math.min(rewardHistory.length, viewCount),
  });
  const packageCountText = t("purchase.recentCount", {
    count: Math.min(packageHistory.length, viewCount),
  });

  return (
    <main className="mx-auto max-w-screen-md px-4 py-4 text-base-content">
      {/* ───────────── 공지사항 ───────────── */}
      <section className="mb-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="card-title">{t("announcements.title")}</h2>
              <Link href="/menu/announcement" className="btn btn-ghost btn-sm">
                {t("announcements.seeAll")}
              </Link>
            </div>

            <ul className="rounded-lg border border-base-300 bg-base-100 overflow-hidden divide-y divide-base-300">
              {announcementsTop.length > 0 ? (
                announcementsTop.map((it) => (
                  <li key={it.id} className="px-3 py-2">
                    <div className="flex items-start gap-3">
                      {/* 아이콘/이니셜 영역 */}
                      <span className="chip w-7 h-7 text-xs shrink-0">N</span>

                      {/* 본문 영역 */}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/menu/announcement?id=${encodeURIComponent(
                            it.id
                          )}`}
                          className="block truncate text-sm font-medium text-base-content hover:underline"
                        >
                          {it.title}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-base-content/70">
                          {formatDateAdapter(it.publishedAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm opacity-70">
                  {t("announcements.empty")}
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* ───────────── 아래: API 데이터 렌더링 ───────────── */}
      {loading ? (
        <div className="alert alert-info">
          <span>{t("loading.homeData")}</span>
        </div>
      ) : err ? (
        <div className="alert alert-error">
          <span>{t("error.generic", { message: String(err) })}</span>
        </div>
      ) : authed ? (
        <>
          {/* 보유 자산 */}
          <section className="mb-6">
            <div className="card">
              <div className="card-body">
                <h2 className="card-title">{t("assets.title")}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <AssetCard
                    code="USDT"
                    name={t("assets.usdt.name")}
                    amount={balances?.usdt ?? 0}
                    badge="neutral"
                  />
                  <AssetCard
                    code="QAI"
                    name={t("assets.qai.name")}
                    amount={balances?.qai ?? 0}
                    badge="neutral"
                  />
                  <AssetCard
                    code="DFT"
                    name={t("assets.dft.name")}
                    amount={balances?.dft ?? 0}
                    badge="neutral"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 보상 내역 */}
          <section className="mb-6">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h2 className="card-title">{t("reward.title")}</h2>
                </div>
                <div className="mb-2 text-sm text-base-content/80">
                  {rewardCountText}
                </div>
                <HistoryTable
                  head={[
                    t("table.head.subject"),
                    t("table.head.date"),
                    t("table.head.amount"),
                  ]}
                  rows={rewardTop.map((r) => [
                    String(r.note ?? r.name ?? ""),
                    formatDateAdapter(r.createdAt),
                    formatAmount(r.amountDFT),
                  ])}
                  emptyLabel={t("reward.empty")}
                  showIndex={false}
                  colAlign={["left", "center", "right"]}
                />
              </div>
            </div>
          </section>

          {/* 구매 이력 */}
          <section className="mb-6">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h2 className="card-title">{t("purchase.title")}</h2>
                </div>
                <div className="mb-2 text-sm text-base-content/80">
                  {packageCountText}
                </div>
                <HistoryTable
                  head={[
                    t("table.head.subject"),
                    t("table.head.date"),
                    t("table.head.amount"),
                  ]}
                  rows={packageTop.map((p) => [
                    `${p.packageName ?? p.packageId} × ${p.quantity}${
                      p.unitPrice
                        ? ` ${t("purchase.unitPriceInline", {
                            price: formatAmount(p.unitPrice),
                          })}`
                        : ""
                    }`,
                    formatDateAdapter(p.createdAt),
                    formatAmount(p.totalPrice ?? 0),
                  ])}
                  emptyLabel={t("purchase.empty")}
                  showIndex={false}
                  colAlign={["left", "center", "right"]}
                />
              </div>
            </div>
          </section>
        </>
      ) : (
        // 비로그인 안내
        <section className="mb-6">
          <div className="card">
            <div className="card-body">
              <div className="alert">
                <span>{t("guest.notice")}</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
