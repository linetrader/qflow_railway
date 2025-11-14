// src/app/[locale]/(site)/auth/signup/view/PasswordConfirmField.tsx
"use client";

import { LockClosedIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function PasswordConfirmField(props: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  submitted: boolean;
  confirmOk: boolean;
}) {
  const { value, onChange, loading, submitted, confirmOk } = props;
  const t = useTranslations("auth.signup");

  return (
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text flex items-center gap-2">
          <LockClosedIcon className="h-4 w-4" aria-hidden />
          {t("fields.confirm.label")}
        </span>
      </div>
      <input
        id="password2"
        type="password"
        className={`input input-bordered w-full ${
          submitted && !confirmOk ? "input-error" : ""
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("fields.confirm.placeholder")}
        disabled={loading}
      />
      <div className="label">
        <span className="label-text-alt text-error">
          {submitted && !confirmOk ? t("validation.passwordMismatch") : ""}
        </span>
      </div>
    </label>
  );
}
