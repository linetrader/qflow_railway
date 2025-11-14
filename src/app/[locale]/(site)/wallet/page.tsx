// src/app/[locale]/(site)/wallet/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { useWalletData } from "./hooks/useWalletData";
import { BalancesSection } from "./view/BalancesSection";
import { HistorySection } from "./view/HistorySection";
import { SellFormSection } from "./view/SellFormSection";
import { TransferSection } from "./view/TransferSection";

export default function WalletPage() {
  const t = useTranslations("wallet");
  const { balances, history, histNext, loading, err, loadMore } =
    useWalletData();

  if (loading && history.length === 0) {
    return (
      <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24">
        <section>
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-2">
                <h2 className="card-title">{t("title")}</h2>
                <div className="badge badge-info">{t("loading.loading")}</div>
              </div>
              <p className="text-sm opacity-70">{t("loading.loadingWallet")}</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (err) {
    return (
      <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24">
        <section>
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-2">
                <h2 className="card-title">{t("title")}</h2>
                <div className="badge badge-error">{t("error.title")}</div>
              </div>
              <div className="alert alert-error">
                <span>{err}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24 space-y-6">
      <BalancesSection balances={balances} />
      <TransferSection />
      <SellFormSection dftBalance={balances.DFT} />
      <HistorySection
        history={history}
        hasMore={Boolean(histNext)}
        loading={loading}
        onLoadMore={loadMore}
      />
    </main>
  );
}
