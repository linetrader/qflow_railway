"use client";

import React from "react";
import SignupView from "./view/SignupView";
import { useAccountLite } from "./hooks/useAccountLite";
import { useTranslations } from "next-intl";

export default function SelfSignupPage() {
  const t = useTranslations("selfSignup");
  const { me, loading } = useAccountLite();

  if (loading) {
    return (
      <main className="mx-auto max-w-screen-sm px-4 pt-10 pb-24">
        <p className="text-sm text-muted">{t("loading")}</p>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="mx-auto max-w-screen-sm px-4 pt-10 pb-24">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body space-y-3">
            <h2 className="card-title">{t("loginRequired.title")}</h2>
            <p className="text-sm text-base-content/70">
              {t("loginRequired.desc")}
            </p>
            <a
              className="btn btn-primary btn-sm w-fit"
              href={`/auth/login?next=${encodeURIComponent("/self-signup")}`}
            >
              {t("loginRequired.cta")}
            </a>
          </div>
        </div>
      </main>
    );
  }

  return <SignupView me={me} />;
}
