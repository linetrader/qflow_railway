// src/app/[locale]/(site)/packages/view/PackagePurchaseView.tsx
"use client";

import { useId } from "react";
import { formatAmount } from "@/lib/format";
import { PurchaseCalcUtils } from "../hooks/usePurchaseCalc";
import type { ApiPackage, PackageQtyMap } from "@/types/packages";
import { AssetCard } from "@/components/ui/data/AssetCard";
import { useTranslations } from "next-intl";

export type PackagePurchaseViewProps = {
  packages: ApiPackage[];
  qtyById: PackageQtyMap;
  onChangeQty: (id: string, v: string) => void;
  onBuy: (e: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  qaiPrice: number | null;
  usdtBalance: number;
  totalUSD: number;
  estQai: number;
  canBuy: boolean;
  insufficient: boolean;
};

export default function PackagePurchaseView(props: PackagePurchaseViewProps) {
  const t = useTranslations("packages");
  const {
    packages,
    qtyById,
    onChangeQty,
    onBuy,
    submitting,
    qaiPrice,
    usdtBalance,
    totalUSD,
    estQai,
    canBuy,
    insufficient,
  } = props;

  const summaryId = useId();
  const hasPrice = typeof qaiPrice === "number" && qaiPrice > 0;

  return (
    <section aria-labelledby="pkg-title" className="space-y-4">
      <h2 id="pkg-title" className="text-lg font-semibold">
        {t("purchase.title")}
      </h2>

      {/* 요약 카드 3개 */}
      <div
        role="group"
        aria-labelledby={summaryId}
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <AssetCard
          code="USDT"
          name={t("purchase.cards.usdtBalance")}
          amount={usdtBalance}
          badge="neutral"
          compact
          formatAmount={(n) => formatAmount(n)}
        />

        <AssetCard
          code="USDT"
          name={t("purchase.cards.totalUSD")}
          amount={totalUSD}
          badge="success"
          compact
          formatAmount={(n) => formatAmount(n)}
        />

        <AssetCard
          code="QAI"
          name={
            hasPrice
              ? t("purchase.cards.estQai")
              : t("purchase.cards.estNoPrice")
          }
          amount={hasPrice ? estQai : 0}
          badge={hasPrice ? "info" : "warning"}
          compact
          formatAmount={(n) => formatAmount(n)}
        />
      </div>

      {/* 리스트 + 입력 */}
      <form onSubmit={onBuy} className="space-y-3">
        <ul className="list list-divider">
          {packages.map((p) => {
            const qtyStr = qtyById[p.id] ?? "";
            return (
              <li
                key={p.id}
                className="list-row grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2"
              >
                <div className="min-w-0 text-left">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {p.name}
                  </p>
                  <p className="text-xs opacity-70">${formatAmount(p.price)}</p>
                </div>

                <div className="w-40 justify-self-end">
                  <label htmlFor={`qty-${p.id}`} className="sr-only">
                    {t("purchase.input.label", { name: p.name })}
                  </label>
                  <input
                    id={`qty-${p.id}`}
                    aria-label={t("purchase.input.label", { name: p.name })}
                    placeholder={t("purchase.input.placeholder")}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={qtyStr}
                    onChange={(e) =>
                      onChangeQty(
                        p.id,
                        PurchaseCalcUtils.sanitizeNumericString(e.target.value)
                      )
                    }
                    className={`input input-bordered input-sm text-center w-full ${
                      insufficient ? "input-error" : ""
                    }`}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {/* 잔액 초과 경고 */}
        {insufficient && (
          <div className="text-xs text-error">
            {t("purchase.warn.insufficient", {
              need: formatAmount(totalUSD),
              have: formatAmount(usdtBalance),
              over: formatAmount(Math.max(0, totalUSD - usdtBalance)),
            })}
          </div>
        )}

        {/* 액션 */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2" />
          <div className="sm:col-span-1">
            <button
              type="submit"
              className={`btn btn-success btn-block ${
                submitting ? "loading" : ""
              } ${!canBuy ? "btn-disabled" : ""}`}
              disabled={!canBuy || submitting}
              title={
                !canBuy
                  ? t("purchase.cta.titleDisabled")
                  : t("purchase.cta.title")
              }
            >
              {submitting
                ? t("purchase.cta.processing")
                : t("purchase.cta.buy")}
            </button>
          </div>
        </div>

        <div className="text-xs">
          <p className="opacity-70">
            {t("purchase.rateLine.label")}{" "}
            {hasPrice
              ? t("purchase.rateLine.value", { price: qaiPrice as number })
              : t("purchase.rateLine.none")}
          </p>
        </div>
      </form>

      <p className="text-sm opacity-70">{t("purchase.notice")}</p>
    </section>
  );
}
