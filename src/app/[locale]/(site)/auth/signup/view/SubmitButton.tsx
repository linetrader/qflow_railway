// src/app/[locale]/(site)/auth/signup/view/SubmitButton.tsx
"use client";

import { useTranslations } from "next-intl";

export default function SubmitButton(props: {
  loading: boolean;
  submitted: boolean;
  formValid: boolean;
  onMarkSubmitted: () => void;
  label?: string; // 외부에서 오버라이드 가능
}) {
  const { loading, submitted, formValid, onMarkSubmitted, label } = props;
  const t = useTranslations("auth.signup");
  const finalLabel = label ?? t("submit.label");

  return (
    <div className="pt-2">
      <button
        type="submit"
        className="btn btn-primary w-full h-11 rounded-xl"
        disabled={loading || (!formValid && submitted)}
        onClick={onMarkSubmitted}
      >
        {loading ? t("submit.working") : finalLabel}
      </button>
    </div>
  );
}
