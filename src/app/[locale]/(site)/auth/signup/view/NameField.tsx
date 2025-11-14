// src/app/[locale]/(site)/auth/signup/view/NameField.tsx
"use client";

import { UserPlusIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function NameField(props: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  submitted: boolean;
  nameOk: boolean;
}) {
  const { value, onChange, loading, submitted, nameOk } = props;
  const t = useTranslations("auth.signup");

  return (
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text flex items-center gap-2">
          <UserPlusIcon className="h-4 w-4" aria-hidden />
          {t("fields.name.label")}
        </span>
      </div>
      <input
        id="name"
        className={`input input-bordered w-full ${
          submitted && !nameOk ? "input-error" : ""
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="name"
        placeholder={t("fields.name.placeholder")}
        disabled={loading}
      />
      <div className="label">
        <span className="label-text-alt text-error">
          {submitted && !nameOk ? t("validation.nameRequired") : ""}
        </span>
      </div>
    </label>
  );
}
