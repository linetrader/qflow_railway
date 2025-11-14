// src/app/[locale]/(site)/wallet/view/BalancesSection.tsx
"use client";

import { AssetCard } from "@/components/ui";
import type { WalletBalances } from "@/types/wallet";
import { useTranslations } from "next-intl";

export function BalancesSection({ balances }: { balances: WalletBalances }) {
  const t = useTranslations("wallet.balances");
  const assets = t.raw("assets") as { USDT: string; QAI: string; DFT: string };

  return (
    <section>
      <div className="card">
        <div className="card-body">
          <h2 className="card-title">{t("title")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AssetCard
              code="USDT"
              name={assets.USDT}
              amount={balances.USDT ?? 0}
              badge="neutral"
            />
            <AssetCard
              code="QAI"
              name={assets.QAI}
              amount={balances.QAI ?? 0}
              badge="neutral"
            />
            <AssetCard
              code="DFT"
              name={assets.DFT}
              amount={balances.DFT ?? 0}
              badge="neutral"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
