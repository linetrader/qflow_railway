// src/app/[locale]/(site)/account/hooks/usePasswordChange.ts
"use client";

import type { PasswordChangeResponse } from "@/types/account";
import {
  checkPasswordRules,
  isPasswordStrong,
} from "@/types/account/passwordRules";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export function usePasswordChange() {
  const t = useTranslations("account.password");
  const tRules = useTranslations("account.password.rules");
  const tCommon = useTranslations("common");

  const [currentPwd, setCurrentPwd] = useState<string>("");
  const [newPwd, setNewPwd] = useState<string>("");
  const [newPwd2, setNewPwd2] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{
    msg: string;
    variant: "info" | "success" | "warning" | "error";
  } | null>(null);

  const { pwLenOk, pwHasLetter, pwHasDigit, pwHasUpper, pwHasSymbol } = useMemo(
    () => checkPasswordRules(newPwd),
    [newPwd]
  );

  const newPwAllOk = isPasswordStrong(newPwd);
  const confirmOk = newPwd.length > 0 && newPwd === newPwd2;
  const canChangePwd =
    currentPwd.length > 0 && newPwAllOk && confirmOk && currentPwd !== newPwd;

  const rules = useMemo(
    () =>
      [
        { ok: pwLenOk, text: tRules("len") },
        { ok: pwHasLetter, text: tRules("letter") },
        { ok: pwHasDigit, text: tRules("digit") },
        { ok: pwHasUpper, text: tRules("upper") },
        { ok: pwHasSymbol, text: tRules("symbol") },
      ] as const,
    [pwLenOk, pwHasLetter, pwHasDigit, pwHasUpper, pwHasSymbol, tRules]
  );

  async function submit(
    changeEndpoint?: string,
    emailForDemo?: string
  ): Promise<{ ok: boolean; message: string }> {
    if (!canChangePwd) return { ok: false, message: t("errors.validation") };

    try {
      setSubmitting(true);
      const r = await fetch(changeEndpoint ?? "/api/account/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          currentPassword: currentPwd,
          newPassword: newPwd,
          email: emailForDemo,
        }),
      });

      const text = await r.text();
      let parsed: PasswordChangeResponse | null = null;
      try {
        parsed = text ? (JSON.parse(text) as PasswordChangeResponse) : null;
      } catch {
        parsed = null;
      }

      if (!r.ok || !parsed || parsed.ok !== true) {
        const msg =
          (parsed &&
            "message" in parsed &&
            typeof parsed.message === "string" &&
            parsed.message) ||
          t("errors.http", { status: r.status });
        setToast({ msg, variant: "error" });
        window.setTimeout(() => setToast(null), 2000);
        return { ok: false, message: msg };
      }

      const successMsg = t("toast.successDesc");
      setToast({ msg: successMsg, variant: "success" });
      window.setTimeout(() => setToast(null), 2000);
      setCurrentPwd("");
      setNewPwd("");
      setNewPwd2("");
      return { ok: true, message: successMsg };
    } catch (e) {
      const msg = e instanceof Error ? e.message : tCommon("errors.network");
      setToast({ msg, variant: "error" });
      window.setTimeout(() => setToast(null), 2000);
      return { ok: false, message: msg };
    } finally {
      setSubmitting(false);
    }
  }

  return {
    values: { currentPwd, newPwd, newPwd2 },
    setters: { setCurrentPwd, setNewPwd, setNewPwd2 },
    flags: {
      pwLenOk,
      pwHasLetter,
      pwHasDigit,
      pwHasUpper,
      pwHasSymbol,
      newPwAllOk,
      confirmOk,
      canChangePwd,
      submitting,
    },
    rules,
    toast,
    setToast,
    submit,
  } as const;
}
