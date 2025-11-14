// src/app/[locale]/(site)/auth/signup/hooks/useSignup.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  ApiErrCode,
  ApiRes,
  FormState,
  RefStatusUI,
  ResolveUserResponse,
  SubmitResult,
} from "@/types/auth";

export function useSignup() {
  const t = useTranslations("auth.signup");
  const searchParams = useSearchParams();

  const [f, setF] = useState<FormState>({
    username: "",
    email: "",
    password: "",
    password2: "",
    name: "",
    referrer: "",
    sponsor: "",
    countryCode: "",
    agreeTerms: false,
    agreePrivacy: false,
  });

  const [refStatus, setRefStatus] = useState<RefStatusUI>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [serverUsernameError, setServerUsernameError] = useState<
    string | undefined
  >();
  const [serverEmailError, setServerEmailError] = useState<
    string | undefined
  >();
  const [serverGeneralError, setServerGeneralError] = useState<
    string | undefined
  >();
  const [serverCountryError, setServerCountryError] = useState<
    string | undefined
  >();

  // URL ?ref= 프리필
  useEffect(() => {
    const fromUrl = (searchParams.get("ref") || "").trim();
    if (!fromUrl) return;
    setF((prev) => (prev.referrer ? prev : { ...prev, referrer: fromUrl }));
    setRefStatus(fromUrl.length >= 3 ? "ok" : "fail");
  }, [searchParams]);

  // 검증
  const usernameOk = useMemo<boolean>(
    () => /^[a-z0-9_]{4,16}$/.test(f.username),
    [f.username]
  );

  const pwLenOk = f.password.length >= 8 && f.password.length <= 18;
  const pwHasLetter = /[A-Za-z]/.test(f.password);
  const pwHasDigit = /\d/.test(f.password);
  const pwHasUpper = /[A-Z]/.test(f.password);
  const pwHasSymbol = /[^A-Za-z0-9]/.test(f.password);
  const pwAllOk =
    pwLenOk && pwHasLetter && pwHasDigit && pwHasUpper && pwHasSymbol;

  const emailOk = useMemo<boolean>(() => {
    if (!f.email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
  }, [f.email]);

  const nameOk = f.name.trim().length > 0;
  const confirmOk = f.password2.length > 0 && f.password === f.password2;

  const countryCodeOk =
    f.countryCode.trim() === "" ||
    (/^[A-Za-z]{2}$/.test(f.countryCode.trim()) && true);

  const referrerOk = f.referrer.trim().length > 0;
  const agreementsOk = f.agreeTerms && f.agreePrivacy;

  const formValid =
    usernameOk &&
    emailOk &&
    pwAllOk &&
    confirmOk &&
    nameOk &&
    agreementsOk &&
    countryCodeOk &&
    referrerOk;

  function setField<K extends keyof FormState>(
    key: K,
    val: FormState[K]
  ): void {
    setF((prev) => ({ ...prev, [key]: val }));
  }

  function resetServerErrors(): void {
    setServerUsernameError(undefined);
    setServerEmailError(undefined);
    setServerGeneralError(undefined);
    setServerCountryError(undefined);
  }

  // 추천인 확인
  async function verifyUser(input: string): Promise<boolean> {
    const q = input.trim();
    if (!q) return false;
    const res = await fetch(
      `/api/auth/resolve-user?q=${encodeURIComponent(q)}`,
      { method: "GET" }
    );
    if (!res.ok) return false;
    const data = (await res
      .json()
      .catch(() => null)) as ResolveUserResponse | null;
    return !!(data && data.ok && "user" in data && data.user);
  }

  async function searchReferrer(): Promise<void> {
    setRefStatus(null);
    const ok = await verifyUser(f.referrer);
    setRefStatus(ok ? "ok" : "fail");
  }

  // 제출
  async function submit(): Promise<SubmitResult> {
    setSubmitted(true);
    resetServerErrors();
    if (!formValid || loading) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: t("errors.validation"),
      };
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: f.username,
          email: f.email,
          password: f.password,
          name: f.name,
          referrer: f.referrer.trim(),
          sponsor: f.sponsor ? f.sponsor : null,
          countryCode: f.countryCode ? f.countryCode : null,
          agreeTerms: f.agreeTerms,
          agreePrivacy: f.agreePrivacy,
        }),
      });

      const data = (await res.json().catch(() => null)) as ApiRes | null;

      if (res.ok && data && data.ok) {
        return { ok: true };
      }

      // 에러 매핑
      let code: ApiErrCode = "UNKNOWN";
      let message: string | undefined = t("errors.server");

      if (data && !data.ok) {
        code = data.code;
        message = data.message;
      } else if (res.status === 400) {
        code = "VALIDATION_ERROR";
      }

      switch (code) {
        case "USERNAME_TAKEN":
          setServerUsernameError(t("errors.usernameTaken"));
          break;
        case "EMAIL_TAKEN":
          setServerEmailError(t("errors.emailTaken"));
          break;
        case "REFERRER_NOT_FOUND":
          setServerGeneralError(t("referrer.notFound"));
          break;
        case "SPONSOR_NOT_FOUND":
          setServerGeneralError(t("errors.sponsorNotFound"));
          break;
        case "COUNTRY_CODE_INVALID":
          setServerCountryError(t("errors.countryCodeInvalid"));
          break;
        case "COUNTRY_NOT_FOUND":
          setServerCountryError(t("errors.countryNotFound"));
          break;
        case "VALIDATION_ERROR":
          setServerGeneralError(t("errors.validation"));
          break;
        default:
          setServerGeneralError(t("errors.server"));
      }

      return { ok: false, code, message };
    } finally {
      setLoading(false);
    }
  }

  return {
    // 상태
    f,
    refStatus,
    submitted,
    loading,
    serverUsernameError,
    serverEmailError,
    serverGeneralError,
    serverCountryError,
    // 파생값
    usernameOk,
    pwLenOk,
    pwHasLetter,
    pwHasDigit,
    pwHasUpper,
    pwHasSymbol,
    pwAllOk,
    emailOk,
    nameOk,
    confirmOk,
    countryCodeOk,
    agreementsOk,
    formValid,
    referrerOk,
    // 액션
    setField,
    setSubmitted,
    searchReferrer,
    submit,
    resetServerErrors,
  } as const;
}
