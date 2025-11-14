// src/app/[locale]/(site)/auth/login/page.tsx
"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { UserIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useLogin } from "./hooks/useLogin";
import { useToast } from "@/components/ui/feedback/Toast-provider";

type QueryObject = Record<string, string>;

function splitPathAndQuery(next: string): {
  pathname: string;
  query: QueryObject;
} {
  const i = next.indexOf("?");
  if (i < 0) return { pathname: next, query: {} };
  const pathname = next.slice(0, i);
  const sp = new URLSearchParams(next.slice(i + 1));
  const query: QueryObject = {};
  sp.forEach((v, k) => {
    query[k] = v;
  });
  return { pathname, query };
}

export default function Login() {
  const router = useRouter();
  const locale = useLocale();
  const { toast } = useToast();
  const t = useTranslations("auth");

  const {
    username,
    pwd,
    submitted,
    busy,
    usernameOk,
    formValid,
    setUsername,
    setPwd,
    setSubmitted,
    submit,
  } = useLogin();

  const usernameErrText = useMemo<string | undefined>(
    () =>
      submitted && !usernameOk ? t("validation.usernameInvalid") : undefined,
    [submitted, usernameOk, t]
  );

  const pwdErrText = useMemo<string | undefined>(
    () =>
      submitted && pwd.length === 0
        ? t("validation.passwordRequired")
        : undefined,
    [submitted, pwd.length, t]
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const res = await submit();

    if (res.ok) {
      toast({
        title: t("toast.success.title"),
        description: t("toast.success.desc"),
        variant: "success",
        position: "top-right",
        duration: 1600,
        closable: true,
      });

      const params = new URLSearchParams(window.location.search);
      const rawNext = params.get("next") ?? "/";
      const { pathname, query } = splitPathAndQuery(rawNext);

      router.replace({ pathname, query }, { locale });
      router.refresh();
      return;
    }

    const msg =
      typeof res.message === "string"
        ? res.message
        : res.code === "INVALID_CREDENTIALS"
        ? t("errors.invalidCredentials")
        : res.code === "VALIDATION_ERROR"
        ? t("errors.validation")
        : t("errors.server");

    toast({
      title: t("toast.error.title"),
      description: msg,
      variant: "error",
      position: "top-right",
      duration: 2400,
      closable: true,
    });
  }

  return (
    <main className="mx-auto max-w-screen-sm px-4 pt-4 pb-24">
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">{t("title")}</h2>

          <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy}>
            {/* 아이디 */}
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text flex items-center gap-2">
                  <UserIcon className="h-4 w-4" aria-hidden />
                  {t("fields.username.label")}
                </span>
              </div>
              <input
                id="login-username"
                className={`input input-bordered w-full ${
                  usernameErrText ? "input-error" : ""
                }`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder={t("fields.username.placeholder")}
              />
              {usernameErrText && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {usernameErrText}
                  </span>
                </div>
              )}
            </label>

            {/* 패스워드 */}
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text flex items-center gap-2">
                  <LockClosedIcon className="h-4 w-4" aria-hidden />
                  {t("fields.password.label")}
                </span>
              </div>
              <input
                id="login-password"
                type="password"
                className={`input input-bordered w-full ${
                  pwdErrText ? "input-error" : ""
                }`}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder={t("fields.password.placeholder")}
                autoComplete="current-password"
              />
              {pwdErrText && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {pwdErrText}
                  </span>
                </div>
              )}
            </label>

            {/* 로그인 버튼 */}
            <div className="pt-2">
              <button
                type="submit"
                className="btn btn-primary h-11 w-full rounded-xl"
                disabled={busy || (submitted && !formValid)}
                onClick={() => setSubmitted(true)}
              >
                {busy ? t("button.loggingIn") : t("button.login")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
