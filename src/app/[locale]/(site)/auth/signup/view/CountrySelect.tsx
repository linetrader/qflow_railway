// src/app/[locale]/(site)/auth/signup/view/CountrySelect.tsx
"use client";

import { COUNTRY_OPTIONS } from "@/types/auth";
import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function CountrySelect(props: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  submitted: boolean;
  countryCodeOk: boolean;
  serverError?: string;
}) {
  const { value, onChange, loading, submitted, countryCodeOk, serverError } =
    props;
  const hasError = !!serverError || (submitted && !countryCodeOk);
  const t = useTranslations("auth.signup");

  return (
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text flex items-center gap-2">
          <GlobeAltIcon className="h-4 w-4" aria-hidden />
          {t("fields.country.label")}
        </span>
      </div>
      <select
        id="countryCode"
        className={`select select-bordered w-full ${
          hasError ? "select-error" : ""
        }`}
        value={value}
        onChange={(e) => onChange((e.target.value ?? "").toUpperCase())}
        disabled={loading}
      >
        {COUNTRY_OPTIONS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      <div className="label">
        <span className="label-text-alt text-error">
          {serverError ||
            (submitted && !countryCodeOk ? t("validation.countryInvalid") : "")}
        </span>
      </div>
    </label>
  );
}
