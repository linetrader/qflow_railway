"use client";

import { useEffect, useRef, useState } from "react";
import type { MeLite } from "@/types/auth/index";
import { useTranslations } from "next-intl";

type AccountLiteState = {
  me: MeLite | null;
  loading: boolean;
  error: string | null;
};

type AccountRes =
  | {
      ok: true;
      profile: { username: string; referralCode: string };
    }
  | {
      ok: false;
      code: "UNAUTH" | "NOT_FOUND" | string;
    };

export function useAccountLite(): AccountLiteState {
  const t = useTranslations("selfSignup");
  const [me, setMe] = useState<MeLite | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/account", {
          method: "GET",
          signal: ac.signal,
          credentials: "include",
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });

        let data: AccountRes | null = null;
        try {
          data = (await res.json()) as AccountRes;
        } catch {
          // JSON 파싱 실패 시 null 유지
        }

        if (!mountedRef.current) return;

        if (!res.ok || !data) {
          setError(t("errors.unexpected", { status: res.status }));
          setMe(null);
          return;
        }

        if (data.ok === true) {
          setMe({
            username: data.profile.username,
            referralCode: data.profile.referralCode,
          });
        } else {
          // 인증 안됨이어도 여기서는 리다이렉트하지 않음
          setMe(null);
        }
      } catch {
        if (!mountedRef.current) return;
        setError(t("errors.network"));
        setMe(null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
      ac.abort();
    };
  }, [t]);

  return { me, loading, error };
}
