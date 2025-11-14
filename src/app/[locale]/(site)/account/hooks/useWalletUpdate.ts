// src/app/[locale]/(site)/account/hooks/useWalletUpdate.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { isValidEvmAddress, toChecksumAddress } from "@/utils/wallet";
import type { UpdateWalletResponse } from "@/types/account";

export function useWalletUpdate(initialWallet: string, otpEnabled: boolean) {
  const t = useTranslations("account.wallet");
  const tCommon = useTranslations("common");

  const [addr, setAddr] = useState<string>(initialWallet ?? "");
  const [valid, setValid] = useState<boolean>(false);
  const [showOtp, setShowOtp] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    variant: "info" | "success" | "warning" | "error";
  } | null>(null);

  useEffect(() => {
    setValid(isValidEvmAddress(addr.trim()));
  }, [addr]);

  useEffect(() => {
    setAddr(initialWallet ?? "");
  }, [initialWallet]);

  const alreadyRegistered = useMemo(
    () => (initialWallet ?? "").trim().length > 0,
    [initialWallet]
  );

  function startSubmit(): void {
    if (!valid) return;
    if (!otpEnabled) {
      setToast({
        msg: t("errors.needOtp"),
        variant: "warning",
      });
      window.setTimeout(() => setToast(null), 2000);
      return;
    }
    setServerErr(null);
    setOtpCode("");
    setShowOtp(true);
  }

  async function confirmSubmit(): Promise<
    { ok: true; value: string } | { ok: false; message?: string }
  > {
    if (!valid || otpCode.length !== 6) {
      return { ok: false, message: tCommon("errors.validation") };
    }
    setSaving(true);
    setServerErr(null);
    try {
      const checksum = toChecksumAddress(addr.trim());
      if (!checksum) {
        const msg = t("errors.invalid");
        setServerErr(msg);
        setToast({ msg, variant: "error" });
        window.setTimeout(() => setToast(null), 2000);
        return { ok: false, message: msg };
      }

      const res = await fetch("/api/account/wallet/withdraw", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ address: checksum, otpCode }),
      });

      const json: unknown = await res.json().catch(() => null);
      const isValidResp = (x: unknown): x is UpdateWalletResponse => {
        if (typeof x !== "object" || x === null) return false;
        return typeof (x as { ok?: unknown }).ok === "boolean";
      };

      if (!res.ok || !isValidResp(json) || json.ok !== true) {
        const code =
          json && typeof json === "object" && "code" in json
            ? (json as { code?: unknown }).code
            : undefined;
        const message =
          json && typeof json === "object" && "message" in json
            ? (json as { message?: unknown }).message
            : undefined;

        const msg =
          (typeof message === "string" && message) ||
          (code === "OTP_REQUIRED"
            ? t("errors.needOtp")
            : code === "OTP_VERIFY_FAILED"
            ? t("errors.otpWrong")
            : t("errors.http", { status: res.status }));

        setServerErr(msg);
        setToast({ msg, variant: "error" });
        window.setTimeout(() => setToast(null), 2000);
        return { ok: false, message: msg };
      }

      const withdrawAddress =
        json.wallet && typeof json.wallet === "object"
          ? json.wallet.withdrawAddress
          : undefined;

      const value =
        typeof withdrawAddress === "string" && withdrawAddress
          ? withdrawAddress
          : checksum;

      setShowOtp(false);
      setToast({ msg: t("toast.success"), variant: "success" });
      window.setTimeout(() => setToast(null), 2000);

      return { ok: true, value };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : tCommon("errors.unknown");
      setServerErr(msg);
      setToast({ msg, variant: "error" });
      window.setTimeout(() => setToast(null), 2000);
      return { ok: false, message: msg };
    } finally {
      setSaving(false);
    }
  }

  return {
    state: {
      addr,
      valid,
      showOtp,
      otpCode,
      saving,
      serverErr,
      alreadyRegistered,
    },
    setters: {
      setAddr,
      setShowOtp,
      setOtpCode,
    },
    actions: { startSubmit, confirmSubmit },
    toast,
    setToast,
  } as const;
}
