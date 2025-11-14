// src/app/[locale]/(site)/auth/signup/view/UsernameField.tsx
"use client";

import { UserPlusIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function UsernameField(props: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  submitted: boolean;
  usernameOk: boolean;
  serverError?: string;
}) {
  const { value, onChange, loading, submitted, usernameOk, serverError } =
    props;
  const hasError = (submitted && !usernameOk) || !!serverError;
  const t = useTranslations("auth.signup");

  return (
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text flex items-center gap-2">
          <UserPlusIcon className="h-4 w-4" aria-hidden />
          {t("fields.username.label")}
        </span>
      </div>
      <input
        id="username"
        className={`input input-bordered w-full ${
          hasError ? "input-error" : ""
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="username"
        placeholder={t("fields.username.placeholder")}
        disabled={loading}
      />
      <div className="label">
        <span className="label-text-alt text-error">
          {serverError ||
            (submitted && !usernameOk ? t("validation.usernameInvalid") : "")}
        </span>
      </div>
    </label>
  );
}
