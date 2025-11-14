// src/app/[locale]/(site)/wallet/view/TransferSection.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function TransferSection() {
  const t = useTranslations("wallet.transfer");
  const router = useRouter();

  return (
    <section>
      <div className="card">
        <div className="card-body">
          <h2 className="card-title">{t("title")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/wallet/deposit")}
              className="btn btn-success h-11 rounded-xl"
            >
              {t("deposit")}
            </button>
            <button
              onClick={() => router.push("/wallet/withdraw")}
              className="btn btn-secondary h-11 rounded-xl"
            >
              {t("withdraw")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
