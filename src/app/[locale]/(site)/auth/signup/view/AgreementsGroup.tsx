// src/app/[locale]/(site)/auth/signup/view/AgreementsGroup.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AgreementsGroup(props: {
  agreeTerms: boolean;
  agreePrivacy: boolean;
  onChangeTerms: (v: boolean) => void;
  onChangePrivacy: (v: boolean) => void;
  loading: boolean;
  submitted: boolean;
  agreementsOk: boolean;
}) {
  const {
    agreeTerms,
    agreePrivacy,
    onChangeTerms,
    onChangePrivacy,
    loading,
    submitted,
    agreementsOk,
  } = props;
  const t = useTranslations("auth.signup");

  return (
    <div className="flex flex-col gap-2">
      <label className="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          className="checkbox"
          checked={agreeTerms}
          onChange={(e) => onChangeTerms(e.target.checked)}
          disabled={loading}
        />
        <span className="label-text">
          {t("agreements.terms.label")}{" "}
          <Link href="/terms" className="underline text-accent">
            {t("agreements.view")}
          </Link>
        </span>
      </label>

      <label className="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          className="checkbox"
          checked={agreePrivacy}
          onChange={(e) => onChangePrivacy(e.target.checked)}
          disabled={loading}
        />
        <span className="label-text">
          {t("agreements.privacy.label")}{" "}
          <Link href="/privacy" className="underline text-accent">
            {t("agreements.view")}
          </Link>
        </span>
      </label>

      {submitted && !agreementsOk && (
        <p className="text-xs text-error">
          {t("validation.agreementsRequired")}
        </p>
      )}
    </div>
  );
}
