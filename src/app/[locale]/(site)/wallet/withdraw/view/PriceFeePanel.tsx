// src/app/[locale]/(site)/wallet/withdraw/view/PriceFeePanel.tsx
"use client";

import type { Prices } from "@/types/common";
import { useTranslations } from "next-intl";

function nfmt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(n);
}

interface Props {
  prices: Prices;
  totalValueUSDT: number;
}

export default function PriceFeePanel({ prices, totalValueUSDT }: Props) {
  const t = useTranslations("wallet.withdraw.panel");

  return (
    <section className="space-y-3">
      <div className="card">
        <div className="card-body">
          <h2 className="text-sm font-semibold">{t("priceFeeTitle")}</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(["USDT", "QAI", "DFT"] as const).map((sym) => (
              <div key={sym} className="stats w-full px-3 py-2 sm:px-4 sm:py-3">
                <div className="stat p-0 flex flex-col items-start gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-neutral" aria-label={sym}>
                      {sym}
                    </span>
                  </div>

                  <p className="stat-value text-base sm:text-lg tabular-nums whitespace-nowrap text-left w-full">
                    {nfmt(prices[sym].price)} USDT
                  </p>

                  <p className="text-xs text-base-content/60">
                    {t("fee", { fee: nfmt(prices[sym].withdrawFee) })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-base-content/60">
            {t("totalVal", { value: nfmt(totalValueUSDT) })}
          </p>
        </div>
      </div>
    </section>
  );
}
