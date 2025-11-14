// src/app/[locale]/(site)/auth/signup/view/PasswordField.tsx
"use client";

import { LockClosedIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function PasswordField(props: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  rules: {
    pwLenOk: boolean;
    pwHasLetter: boolean;
    pwHasDigit: boolean;
    pwHasUpper: boolean;
    pwHasSymbol: boolean;
  };
}) {
  const { value, onChange, loading, rules } = props;
  const t = useTranslations("auth.signup");

  return (
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text flex items-center gap-2">
          <LockClosedIcon className="h-4 w-4" aria-hidden />
          {t("fields.password.label")}
        </span>
      </div>
      <input
        id="password"
        type="password"
        className="input input-bordered w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("fields.password.placeholder")}
        aria-describedby="pw-help"
        disabled={loading}
      />
      <ul id="pw-help" className="mt-2 space-y-1 text-xs">
        <li className={rules.pwLenOk ? "text-base-content/60" : "text-error"}>
          {t("fields.password.rules.length")}
        </li>
        <li
          className={rules.pwHasLetter ? "text-base-content/60" : "text-error"}
        >
          {t("fields.password.rules.letter")}
        </li>
        <li
          className={rules.pwHasDigit ? "text-base-content/60" : "text-error"}
        >
          {t("fields.password.rules.digit")}
        </li>
        <li
          className={rules.pwHasUpper ? "text-base-content/60" : "text-error"}
        >
          {t("fields.password.rules.upper")}
        </li>
        <li
          className={rules.pwHasSymbol ? "text-base-content/60" : "text-error"}
        >
          {t("fields.password.rules.symbol")}
        </li>
      </ul>
    </label>
  );
}
