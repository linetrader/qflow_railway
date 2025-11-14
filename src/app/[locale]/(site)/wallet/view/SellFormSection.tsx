// src/app/[locale]/(site)/wallet/view/SellFormSection.tsx
"use client";

import { DFT_PRICE_USDT } from "@/types/wallet";
import { nfmt } from "@/lib/format";
import { useSellForm } from "../hooks/useSellForm";
import { useTranslations } from "next-intl";

export function SellFormSection({ dftBalance }: { dftBalance: number }) {
  const t = useTranslations("wallet.sell");
  const {
    sellAmtInput,
    setSellAmtInput,
    isValid,
    total,
    submit,
    toastOpen,
    toastMsg,
    closeToast,
  } = useSellForm(dftBalance);

  return (
    <section>
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title">{t("title")}</h2>
            <div className="badge badge-info">
              {t("hold", { amount: nfmt(dftBalance) })}
            </div>
          </div>

          {toastOpen && (
            <div className="toast toast-end">
              <div className="alert alert-success">
                <span>{toastMsg}</span>
                <button className="btn btn-xs" onClick={closeToast}>
                  {/* 언어 비노출(닫기 버튼은 UI 컨트롤) */}×
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t("qty")}</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={sellAmtInput}
                  onChange={(e) => setSellAmtInput(e.target.value)}
                  placeholder={t("placeholderQty")}
                  className="input input-bordered w-full min-w-0"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t("unit")}</span>
                </label>
                <div className="input input-bordered flex items-center min-w-0">
                  {nfmt(DFT_PRICE_USDT)}
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t("total")}</span>
                </label>
                <div className="input input-bordered flex items-center min-w-0">
                  {nfmt(total || 0)}
                </div>
              </div>

              <div className="form-control sm:self-end">
                <button
                  type="submit"
                  className="btn btn-success h-11 rounded-xl w-full sm:w-28"
                  disabled={!isValid}
                  title={!isValid ? t("invalid") : t("submit")}
                >
                  {t("submit")}
                </button>
              </div>
            </div>
          </form>

          {!isValid && (
            <p className="mt-2 text-xs text-error">{t("invalid")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
