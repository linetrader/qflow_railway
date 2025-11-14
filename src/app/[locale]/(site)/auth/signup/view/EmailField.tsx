// src/app/[locale]/(site)/auth/signup/view/EmailField.tsx
"use client";

import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function EmailField(props: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  submitted: boolean;
  emailOk: boolean;
  serverError?: string;
}) {
  const { value, onChange, loading, submitted, emailOk, serverError } = props;
  const hasError = (submitted && !emailOk) || !!serverError;
  const t = useTranslations("auth.signup");

  return (
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text flex items-center gap-2">
          <EnvelopeIcon className="h-4 w-4" aria-hidden />
          {t("fields.email.label")}
        </span>
      </div>
      <input
        id="email"
        type="email"
        className={`input input-bordered w-full ${
          hasError ? "input-error" : ""
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="email"
        placeholder={t("fields.email.placeholder")}
        disabled={loading}
      />
      <div className="label">
        <span className="label-text-alt text-error">
          {serverError ||
            (submitted && !emailOk ? t("validation.emailInvalid") : "")}
        </span>
      </div>
    </label>
  );
}
