// src/app/[locale]/(site)/account/hooks/useAccountProfile.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ProfileState, AccountGetResponse } from "@/types/account";

export function useAccountProfile() {
  const t = useTranslations("account.page");
  const tCommon = useTranslations("common");

  const [profile, setProfile] = useState<ProfileState>({
    username: "",
    email: "",
    name: "",
    countryCode: null,
    countryName: null,
    wallet: "",
    refCode: "",
    otpEnabled: false,
    otpSecret: "",
    otpQr: "",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });

      const text = await res.text();
      let json: AccountGetResponse | null = null;
      try {
        json = text ? (JSON.parse(text) as AccountGetResponse) : null;
      } catch {
        json = null;
      }

      if (!res.ok || !json) {
        throw new Error(t("errors.http", { status: res.status }));
      }
      if (json.ok !== true) {
        const msg = json.message ?? t("errors.generic");
        throw new Error(msg);
      }

      const p = json.profile;
      setProfile((prev) => ({
        ...prev,
        username: p.username,
        email: p.email,
        name: p.name,
        countryCode: p.country?.code ?? null,
        countryName: p.country?.name ?? null,
        wallet: p.wallet?.withdrawAddress ?? "",
        refCode: p.referralCode,
        otpEnabled: p.googleOtpEnabled,
        otpSecret: "",
        otpQr: "",
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : tCommon("errors.unknown");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [t, tCommon]);

  useEffect(() => {
    void load();
  }, [load]);

  return { profile, setProfile, loading, error, reload: load } as const;
}
