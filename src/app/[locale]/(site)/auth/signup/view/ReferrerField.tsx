// src/app/[locale]/(site)/auth/signup/view/ReferrerField.tsx
"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export type ReferrerFieldProps = {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  refStatus: null | "ok" | "fail";
  onSearch: () => void;
  submitted: boolean;
  referrerOk: boolean;
};

export default function ReferrerField(props: ReferrerFieldProps) {
  const {
    value,
    onChange,
    loading,
    refStatus,
    onSearch,
    submitted,
    referrerOk,
  } = props;
  const showRequiredError = submitted && !referrerOk;
  const t = useTranslations("auth.signup");

  return (
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text flex items-center gap-2">
          <MagnifyingGlassIcon className="h-4 w-4" aria-hidden />
          {t("fields.referrer.label")}
          <span className="text-error ml-1">*</span>
        </span>
      </div>
      <div className="join w-full">
        <input
          id="ref"
          className="input input-bordered join-item w-full"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("fields.referrer.placeholder")}
          disabled={loading}
          required
        />
        <button
          type="button"
          className="btn join-item"
          onClick={onSearch}
          disabled={loading || value.trim().length === 0}
          aria-label={t("fields.referrer.searchAria")}
          title={t("fields.referrer.search")}
        >
          {t("fields.referrer.search")}
        </button>
      </div>
      <div className="label">
        <span className="label-text-alt">
          {showRequiredError ? (
            <span className="text-error">
              {t("validation.referrerRequired")}
            </span>
          ) : refStatus === "ok" ? (
            <span className="text-success">
              {t("fields.referrer.status.ok")}
            </span>
          ) : refStatus === "fail" ? (
            <span className="text-error">
              {t("fields.referrer.status.fail")}
            </span>
          ) : (
            ""
          )}
        </span>
      </div>
    </label>
  );
}
