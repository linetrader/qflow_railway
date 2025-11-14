// src/app/[locale]/(site)/auth/signup/view/SignupView.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSignup } from "../hooks/useSignup";
import UsernameField from "./UsernameField";
import EmailField from "./EmailField";
import PasswordField from "./PasswordField";
import PasswordConfirmField from "./PasswordConfirmField";
import NameField from "./NameField";
import CountrySelect from "./CountrySelect";
import ReferrerField from "./ReferrerField";
import AgreementsGroup from "./AgreementsGroup";
import SubmitButton from "./SubmitButton";

export default function SignupView() {
  const t = useTranslations("auth.signup");
  const router = useRouter();
  const s = useSignup();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const r = await s.submit();
    if (r.ok) router.push("/auth/login");
  }

  return (
    <main className="mx-auto max-w-screen-sm px-4 pt-4 pb-24">
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">{t("title")}</h2>

          {s.serverGeneralError && (
            <div className="alert alert-error my-2">
              <span>{s.serverGeneralError}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" aria-busy={s.loading}>
            <UsernameField
              value={s.f.username}
              onChange={(v) => {
                s.setField("username", v);
                if (s.serverUsernameError) s.resetServerErrors();
              }}
              loading={s.loading}
              submitted={s.submitted}
              usernameOk={s.usernameOk}
              serverError={s.serverUsernameError}
            />

            <EmailField
              value={s.f.email}
              onChange={(v) => {
                s.setField("email", v);
                if (s.serverEmailError) s.resetServerErrors();
              }}
              loading={s.loading}
              submitted={s.submitted}
              emailOk={s.emailOk}
              serverError={s.serverEmailError}
            />

            <PasswordField
              value={s.f.password}
              onChange={(v) => s.setField("password", v)}
              loading={s.loading}
              rules={{
                pwLenOk: s.pwLenOk,
                pwHasLetter: s.pwHasLetter,
                pwHasDigit: s.pwHasDigit,
                pwHasUpper: s.pwHasUpper,
                pwHasSymbol: s.pwHasSymbol,
              }}
            />

            <PasswordConfirmField
              value={s.f.password2}
              onChange={(v) => s.setField("password2", v)}
              loading={s.loading}
              submitted={s.submitted}
              confirmOk={s.confirmOk}
            />

            <NameField
              value={s.f.name}
              onChange={(v) => s.setField("name", v)}
              loading={s.loading}
              submitted={s.submitted}
              nameOk={s.nameOk}
            />

            <CountrySelect
              value={s.f.countryCode}
              onChange={(v) => {
                s.setField("countryCode", v);
                if (s.serverCountryError) s.resetServerErrors();
              }}
              loading={s.loading}
              submitted={s.submitted}
              countryCodeOk={s.countryCodeOk}
              serverError={s.serverCountryError}
            />

            <ReferrerField
              value={s.f.referrer}
              onChange={(v) => s.setField("referrer", v)}
              loading={s.loading}
              refStatus={s.refStatus}
              onSearch={() => s.searchReferrer()}
              submitted={s.submitted}
              referrerOk={s.referrerOk}
            />

            <AgreementsGroup
              agreeTerms={s.f.agreeTerms}
              agreePrivacy={s.f.agreePrivacy}
              onChangeTerms={(v) => s.setField("agreeTerms", v)}
              onChangePrivacy={(v) => s.setField("agreePrivacy", v)}
              loading={s.loading}
              submitted={s.submitted}
              agreementsOk={s.agreementsOk}
            />

            <SubmitButton
              loading={s.loading}
              submitted={s.submitted}
              formValid={s.formValid}
              onMarkSubmitted={() => s.setSubmitted(true)}
              label={t("submit.label")}
            />
          </form>
        </div>
      </div>
    </main>
  );
}
