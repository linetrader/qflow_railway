// src/app/[locale]/(site)/wallet/withdraw/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWalletAndPrices } from "./hooks/useWalletAndPrices";
import { useWithdraw } from "./hooks/useWithdraw";
import type { ToastVariant, TokenSymbol } from "@/types/common";
import WithdrawHeader from "./view/WithdrawHeader";
import PriceFeePanel from "./view/PriceFeePanel";
import TokenWithdrawCard from "./view/TokenWithdrawCard";
import { useTranslations } from "next-intl";

export default function WithdrawPage() {
  const t = useTranslations("wallet.withdraw");
  const router = useRouter();
  const { loading, error, balances, prices, refresh } = useWalletAndPrices();
  const { submitting, submit } = useWithdraw();

  const [toastOpen, setToastOpen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");
  const [toastVariant, setToastVariant] = useState<ToastVariant>("info");
  const showToast = (msg: string, variant: ToastVariant = "info") => {
    setToastMsg(msg);
    setToastVariant(variant);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2000);
  };

  const totalValueUSDT = useMemo(() => {
    return (
      balances.USDT * prices.USDT.price +
      balances.QAI * prices.QAI.price +
      balances.DFT * prices.DFT.price
    );
  }, [balances, prices]);

  const handleSubmit = async (token: TokenSymbol, amount: number) => {
    const res = await submit(token, amount);
    if (!res.ok) {
      showToast(res.message, "error");
      return;
    }
    if (res.nextBalances) {
      await refresh();
    }
    showToast(res.message, "success");
  };

  return (
    <main className="mx-auto max-w-screen-sm px-4 pt-4 pb-24 space-y-6">
      {toastOpen && (
        <div className="toast toast-top toast-end z-50">
          <div
            className={[
              "alert",
              toastVariant === "success"
                ? "alert-success"
                : toastVariant === "warning"
                ? "alert-warning"
                : toastVariant === "error"
                ? "alert-error"
                : "alert-info",
            ].join(" ")}
          >
            <span className="text-sm">{toastMsg}</span>
          </div>
        </div>
      )}

      <WithdrawHeader onBack={() => router.back()} />

      {loading ? (
        <section className="space-y-2">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body flex flex-row items-center gap-2 py-3">
              <h2 className="text-sm font-semibold">{t("loading.title")}</h2>
              <div className="badge badge-info ml-auto">
                {t("loading.loading")}
              </div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <p className="text-sm text-base-content/60">
                {t("loading.loadingDetail")}
              </p>
            </div>
          </div>
        </section>
      ) : error ? (
        <section className="space-y-2">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body flex flex-row items-center gap-2 py-3">
              <h2 className="text-sm font-semibold">{t("error.title")}</h2>
              <div className="badge badge-error ml-auto">
                {t("error.badge")}
              </div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div role="alert" className="alert alert-error py-2 min-h-0">
                <span className="text-sm">{error}</span>
                <div className="ml-auto">
                  <button
                    className="btn btn-sm"
                    onClick={() => refresh()}
                    type="button"
                  >
                    {t("error.retry")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <PriceFeePanel prices={prices} totalValueUSDT={totalValueUSDT} />

          <section className="space-y-3">
            <div className="card">
              <div className="card-body">
                <h2 className="text-sm font-semibold">
                  {t("cards.sectionTitle")}
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  <TokenWithdrawCard
                    token="USDT"
                    balance={balances.USDT}
                    price={prices.USDT.price}
                    onSubmit={(amt) => handleSubmit("USDT", amt)}
                  />
                  <TokenWithdrawCard
                    token="DFT"
                    balance={balances.DFT}
                    price={prices.DFT.price}
                    onSubmit={(amt) => handleSubmit("DFT", amt)}
                  />
                </div>

                {submitting && (
                  <div className="mt-3">
                    <progress className="progress w-full" />
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
