// src/app/[locale]/(site)/wallet/withdraw/view/TokenWithdrawCard.tsx
"use client";

import type { TokenSymbol } from "@/types/common";
import { useMemo, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";

interface Props {
  token: TokenSymbol;
  balance: number;
  price: number;
  onSubmit: (amount: number) => void | Promise<void>;
}

function nfmt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(n);
}
function toNum(s: string): number {
  const v = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(v) ? v : 0;
}

export default function TokenWithdrawCard({
  token,
  balance,
  price,
  onSubmit,
}: Props) {
  const t = useTranslations("wallet.withdraw.cards");
  const [amt, setAmt] = useState<string>("");

  const n = useMemo(() => toNum(amt), [amt]);
  const valid = n > 0 && n <= balance;

  const onChangeAmt = (e: ChangeEvent<HTMLInputElement>): void => {
    setAmt(e.target.value);
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{token}</h3>
          <div className="badge badge-ghost">
            {t("hold", { amount: nfmt(balance), token })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 form-control">
            <label className="label">
              <span className="label-text">{t("amountLabel")}</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder={t("amountPlaceholder")}
              className="input input-bordered w-full"
              value={amt}
              onChange={onChangeAmt}
            />
          </div>
          <button
            className="btn btn-primary h-11"
            disabled={!valid}
            title={!valid ? t("submitTitleInvalid") : t("submit")}
            onClick={() => valid && onSubmit(n)}
            type="button"
          >
            {t("submit")}
          </button>
        </div>

        {amt && (
          <p className="mt-1 text-xs text-base-content/60">
            {t("est", { value: nfmt(n * price) })}
          </p>
        )}
        {!valid && amt && (
          <p className="mt-1 text-xs text-error">{t("invalid")}</p>
        )}
      </div>
    </div>
  );
}
