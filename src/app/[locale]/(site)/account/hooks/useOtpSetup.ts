// src/app/[locale]/(site)/account/hooks/useOtpSetup.ts
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import type {
  OtpInitResponse,
  OtpInitOk,
  OtpInitErr,
  OtpRegisterResponse,
} from "@/types/account";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isOtpInitOk(x: unknown): x is OtpInitOk {
  return (
    isRecord(x) &&
    x.ok === true &&
    typeof x.secretBase32 === "string" &&
    typeof x.otpauth === "string"
  );
}
function isOtpInitErr(x: unknown): x is OtpInitErr {
  return isRecord(x) && x.ok === false && typeof x.code === "string";
}
function isOtpRegisterResponse(x: unknown): x is OtpRegisterResponse {
  return isRecord(x) && typeof x.ok === "boolean";
}
function extractMessage(u: unknown): string | null {
  return isRecord(u) && typeof u.message === "string" ? u.message : null;
}

export function useOtpSetup(email: string, enabled: boolean) {
  const t = useTranslations("account.otp");
  const tCommon = useTranslations("common");
  const [secret, setSecret] = useState<string>("");
  const [qr, setQr] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [toast, setToast] = useState<{
    msg: string;
    variant: "info" | "success" | "warning" | "error";
  } | null>(null);

  useEffect(() => {
    if (!email || enabled || secret) return;
    let aborted = false;

    (async () => {
      try {
        const r = await fetch("/api/account/otp/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, issuer: tCommon("app.name") }),
          credentials: "same-origin",
        });

        const text = await r.text();
        let parsed: unknown = null;
        try {
          parsed = text ? (JSON.parse(text) as OtpInitResponse) : null;
        } catch {
          parsed = null;
        }

        if (!r.ok || !isOtpInitOk(parsed)) {
          const msg =
            (isOtpInitErr(parsed) && parsed.message) ||
            extractMessage(parsed) ||
            t("errors.initHttp", { status: r.status });
          throw new Error(msg);
        }

        const dataUrl = await QRCode.toDataURL(parsed.otpauth, {
          width: 220,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });

        if (!aborted) {
          setSecret(parsed.secretBase32);
          setQr(dataUrl);
        }
      } catch (e: unknown) {
        if (!aborted) {
          const msg = e instanceof Error ? e.message : t("errors.init");
          setSecret("");
          setQr("");
          setToast({ msg, variant: "error" });
          window.setTimeout(() => setToast(null), 2000);
        }
      }
    })();

    return () => {
      aborted = true;
    };
  }, [email, enabled, secret, t, tCommon]);

  async function register(): Promise<boolean> {
    if (enabled || !secret || code.length !== 6) return false;

    try {
      const res = await fetch("/api/account/otp/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, code }),
      });

      const text = await res.text();
      let parsed: unknown = null;
      try {
        parsed = text ? (JSON.parse(text) as OtpRegisterResponse) : null;
      } catch {
        parsed = null;
      }

      if (!res.ok || !isOtpRegisterResponse(parsed) || parsed.ok !== true) {
        const message =
          extractMessage(parsed) ||
          t("errors.registerHttp", { status: res.status });
        setToast({ msg: message, variant: "error" });
        window.setTimeout(() => setToast(null), 2000);
        return false;
      }

      setToast({ msg: t("toast.successDesc"), variant: "success" });
      window.setTimeout(() => setToast(null), 2000);
      setCode("");
      return true;
    } catch {
      setToast({ msg: tCommon("errors.network"), variant: "error" });
      window.setTimeout(() => setToast(null), 2000);
      return false;
    }
  }

  return { secret, qr, code, setCode, toast, setToast, register } as const;
}
