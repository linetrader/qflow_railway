// src/app/[locale]/(site)/wallet/withdraw/view/WithdrawHeader.tsx
"use client";

import { useTranslations } from "next-intl";

interface Props {
  onBack: () => void;
}

export default function WithdrawHeader({ onBack }: Props) {
  const t = useTranslations("wallet.withdraw.header");
  return (
    <section className="space-y-2">
      <div className="card">
        <div className="card-body flex flex-row items-center gap-2 py-3">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            aria-label={t("back")}
            title={t("back")}
            onClick={onBack}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M15 18l-6-6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-base font-semibold">{t("title")}</h1>
          <div className="ml-auto" />
        </div>
      </div>
    </section>
  );
}
