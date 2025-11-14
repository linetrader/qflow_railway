// src/app/[locale]/(site)/auth/login/hooks/useLogin.ts
"use client";

import {
  isLoginResponse,
  type LoginErrorCode,
  type LoginRequest,
} from "@/types/auth";
import { useMemo, useState } from "react";

export type LoginSubmitResult =
  | { ok: true }
  | { ok: false; code: LoginErrorCode; message?: string };

export function useLogin() {
  const [username, setUsername] = useState<string>("");
  const [pwd, setPwd] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const usernameOk = useMemo<boolean>(
    () => /^[a-z0-9_]{4,16}$/.test(username),
    [username]
  );

  const formValid = useMemo<boolean>(
    () => usernameOk && pwd.length > 0,
    [usernameOk, pwd]
  );

  async function submit(): Promise<LoginSubmitResult> {
    setSubmitted(true);
    if (!formValid) {
      return { ok: false, code: "VALIDATION_ERROR" };
    }

    setBusy(true);
    try {
      const payload: LoginRequest = { username, password: pwd };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!isLoginResponse(data)) {
        // 페이지에서 i18n 키로 매핑하므로 message는 생략
        return { ok: false, code: "UNKNOWN" };
      }

      if (res.ok && data.ok) return { ok: true };

      const code: LoginErrorCode =
        (!res.ok && res.status === 401) ||
        (!data.ok && data.code === "INVALID_CREDENTIALS")
          ? "INVALID_CREDENTIALS"
          : (!res.ok && res.status === 400) ||
            (!data.ok && data.code === "VALIDATION_ERROR")
          ? "VALIDATION_ERROR"
          : "UNKNOWN";

      const message =
        !data.ok && typeof data.message === "string" ? data.message : undefined;

      return { ok: false, code, message };
    } finally {
      setBusy(false);
    }
  }

  return {
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
  } as const;
}
