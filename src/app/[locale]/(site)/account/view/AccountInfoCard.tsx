// src/app/[locale]/(site)/account/view/AccountInfoCard.tsx
"use client";

import { useTranslations } from "next-intl";

export function AccountInfoCard(props: {
  username: string;
  email: string;
  name: string;
  countryLabel: string;
}) {
  const { username, email, name, countryLabel } = props;
  const t = useTranslations("account.info");

  return (
    <div className="card">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title">{t("title")}</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem label={t("username")} value={username} mono />
          <InfoItem label={t("email")} value={email} mono />
          <InfoItem label={t("name")} value={name} />
          <InfoItem label={t("country")} value={countryLabel} />
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-base-content/20 bg-base-100 px-3 py-2">
      <p className="text-xs text-base-content/60">{label}</p>
      <p
        className={[
          "mt-1 text-sm text-base-content break-all",
          mono ? "font-mono" : "",
        ].join(" ")}
      >
        {value || "-"}
      </p>
    </div>
  );
}
