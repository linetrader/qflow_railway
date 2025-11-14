"use client";

import React from "react";
import type { MeLite } from "@/types/auth/index";
import { useSelfSignup } from "../hooks/useSelfSignup";
import { useTranslations } from "next-intl";

// 재사용 컴포넌트
import UsernameField from "../../auth/signup/view/UsernameField";
import EmailField from "../../auth/signup/view/EmailField";
import PasswordField from "../../auth/signup/view/PasswordField";
import PasswordConfirmField from "../../auth/signup/view/PasswordConfirmField";
import NameField from "../../auth/signup/view/NameField";
import CountrySelect from "../../auth/signup/view/CountrySelect";
import ReferrerField from "../../auth/signup/view/ReferrerField";
import AgreementsGroup from "../../auth/signup/view/AgreementsGroup";
import SubmitButton from "../../auth/signup/view/SubmitButton";

export default function SignupView({ me }: { me: MeLite }) {
  const t = useTranslations("selfSignup");
  const s = useSelfSignup(me);

  const refUiStatus: "ok" | "fail" | null =
    s.refStatus.state === "ok"
      ? "ok"
      : s.refStatus.state === "not_found" || s.refStatus.state === "error"
      ? "fail"
      : null;

  const referrerOk: boolean = me.referralCode.trim().length > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const r = await s.submit();
    if (r.ok) {
      // router.push("/auth/login");
    }
  }

  return (
    <main className="mx-auto max-w-screen-sm px-4 pt-4 pb-24">
      <div className="card">
        <div className="card-body">
          <h2 className="card-title">{t("title")}</h2>

          {s.serverGeneralError ? (
            <div className="alert alert-error my-2">
              <span>{s.serverGeneralError}</span>
            </div>
          ) : null}

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

            {/* ReferrerField는 표시만: 값 고정 */}
            <ReferrerField
              value={me.referralCode}
              onChange={() => {}}
              loading={false}
              refStatus={refUiStatus}
              onSearch={() => {}}
              submitted={s.submitted}
              referrerOk={referrerOk}
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
              label={t("submit")}
            />
          </form>

          <div className="mt-3 text-xs text-base-content/70">
            {t.rich("note.fixedRef", {
              b: (c) => <b>{c}</b>,
              code: (c) => <code>{c}</code>,
              username: me.username,
              ref: me.referralCode,
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
