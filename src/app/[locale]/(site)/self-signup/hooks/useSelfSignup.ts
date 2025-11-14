"use client";

import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/components/ui/feedback/Toast-provider";
import type { ApiRes, FormState, MeLite, RefStatus } from "@/types/auth/index";
import { COUNTRY_OPTIONS } from "@/types/auth";
import { useTranslations } from "next-intl";

// === 로컬 검증 유틸 ===
const usernameOk = (v: string): boolean => /^[a-z0-9_]{4,16}$/.test(v);
const emailOk = (v: string): boolean =>
  !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const pwChecklist = (v: string) => ({
  len: v.length >= 8 && v.length <= 18,
  letter: /[A-Za-z]/.test(v),
  digit: /\d/.test(v),
  upper: /[A-Z]/.test(v),
  symbol: /[^A-Za-z0-9]/.test(v),
});
const pwAllOk = (c: ReturnType<typeof pwChecklist>): boolean =>
  c.len && c.letter && c.digit && c.upper && c.symbol;
const countryCodeOk = (v: string): boolean => {
  const t = v.trim();
  if (t === "") return true;
  if (!/^[A-Za-z]{2}$/.test(t)) return false;
  return COUNTRY_OPTIONS.map((o) => o.value).includes(t.toUpperCase());
};

export function useSelfSignup(me: MeLite): {
  f: FormState;
  setField: <K extends keyof FormState>(key: K, val: FormState[K]) => void;
  loading: boolean;
  submitted: boolean;
  setSubmitted: (v: boolean) => void;

  // 유효성
  usernameOk: boolean;
  emailOk: boolean;
  pwLenOk: boolean;
  pwHasLetter: boolean;
  pwHasDigit: boolean;
  pwHasUpper: boolean;
  pwHasSymbol: boolean;
  confirmOk: boolean;
  nameOk: boolean;
  countryCodeOk: boolean;
  agreementsOk: boolean;
  formValid: boolean;

  // 서버 에러
  serverUsernameError?: string;
  serverEmailError?: string;
  serverGeneralError?: string;
  serverCountryError?: string;

  // 추천인 상태(고정)
  refStatus: RefStatus;

  // 액션
  resetServerErrors: () => void;
  submit: () => Promise<ApiRes>;
} {
  const t = useTranslations("selfSignup");
  const toast = useToast();

  const [f, setF] = useState<FormState>({
    username: "",
    email: "",
    password: "",
    password2: "",
    name: "",
    countryCode: "",
    referrer: me.referralCode, // 고정
    sponsor: "",
    agreeTerms: false,
    agreePrivacy: false,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const [serverUsernameError, setServerUsernameError] = useState<
    string | undefined
  >(undefined);
  const [serverEmailError, setServerEmailError] = useState<string | undefined>(
    undefined
  );
  const [serverGeneralError, setServerGeneralError] = useState<
    string | undefined
  >(undefined);
  const [serverCountryError, setServerCountryError] = useState<
    string | undefined
  >(undefined);

  const refStatus = useMemo<RefStatus>(
    () => ({ state: "ok", username: me.username }),
    [me.username]
  );

  const pwC = useMemo(() => pwChecklist(f.password), [f.password]);

  const usernameOkV = useMemo(() => usernameOk(f.username), [f.username]);
  const emailOkV = useMemo(() => emailOk(f.email), [f.email]);
  const pwLenOk = pwC.len;
  const pwHasLetter = pwC.letter;
  const pwHasDigit = pwC.digit;
  const pwHasUpper = pwC.upper;
  const pwHasSymbol = pwC.symbol;
  const confirmOk = f.password2.length > 0 && f.password2 === f.password;
  const nameOkV = f.name.trim().length > 0;
  const countryCodeOkV = useMemo(
    () => countryCodeOk(f.countryCode),
    [f.countryCode]
  );
  const agreementsOkV = f.agreeTerms && f.agreePrivacy;

  const formValid =
    usernameOkV &&
    emailOkV &&
    pwAllOk(pwC) &&
    confirmOk &&
    nameOkV &&
    countryCodeOkV &&
    agreementsOkV;

  const setField = useCallback(
    <K extends keyof FormState>(key: K, val: FormState[K]) => {
      if (key === "referrer") return;
      setF((prev) => ({ ...prev, [key]: val }));
    },
    []
  );

  const resetServerErrors = useCallback(() => {
    setServerUsernameError(undefined);
    setServerEmailError(undefined);
    setServerGeneralError(undefined);
    setServerCountryError(undefined);
  }, []);

  const submit = useCallback(async (): Promise<ApiRes> => {
    setSubmitted(true);
    resetServerErrors();

    if (!formValid || loading) {
      return { ok: false, code: "VALIDATION_ERROR" };
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
          referrer: me.referralCode,
          sponsor: f.sponsor ?? null,
          countryCode: f.countryCode || null,
          agreeTerms: f.agreeTerms,
          agreePrivacy: f.agreePrivacy,
        }),
      });

      const data = (await res.json()) as ApiRes;

      if (res.ok && data.ok) {
        toast.toast({
          title: t("toast.success.title"),
          description: t("toast.success.desc"),
          variant: "success",
        });
        return data;
      }

      if (!res.ok && "code" in data) {
        switch (data.code) {
          case "USERNAME_TAKEN":
            setServerUsernameError(t("errors.usernameTaken"));
            break;
          case "EMAIL_TAKEN":
            setServerEmailError(t("errors.emailTaken"));
            break;
          case "REFERRER_NOT_FOUND":
            setServerGeneralError(t("errors.referrerNotFound"));
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
      } else {
        setServerGeneralError(t("errors.server"));
      }

      toast.toast({
        title: t("toast.fail.title"),
        description: t("toast.fail.desc"),
        variant: "error",
      });
      return data;
    } catch {
      setServerGeneralError(t("errors.network"));
      toast.toast({
        title: t("toast.network.title"),
        description: t("toast.network.desc"),
        variant: "error",
      });
      return { ok: false, code: "UNKNOWN" };
    } finally {
      setLoading(false);
    }
  }, [f, me.referralCode, formValid, loading, resetServerErrors, toast, t]);

  return {
    f,
    setField,
    loading,
    submitted,
    setSubmitted,

    usernameOk: usernameOkV,
    emailOk: emailOkV,
    pwLenOk,
    pwHasLetter,
    pwHasDigit,
    pwHasUpper,
    pwHasSymbol,
    confirmOk,
    nameOk: nameOkV,
    countryCodeOk: countryCodeOkV,
    agreementsOk: agreementsOkV,
    formValid,

    serverUsernameError,
    serverEmailError,
    serverGeneralError,
    serverCountryError,

    refStatus,

    resetServerErrors,
    submit,
  };
}
