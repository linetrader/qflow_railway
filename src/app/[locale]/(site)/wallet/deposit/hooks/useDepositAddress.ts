// src/app/[locale]/(site)/wallet/deposit/hooks/useDepositAddress.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  DepositAddressPayload,
  RawDepositApiSuccess,
  RawDepositApiError,
} from "@/types/wallet";
import { useTranslations } from "next-intl";

function isSuccessJson(v: unknown): v is RawDepositApiSuccess {
  if (typeof v !== "object" || v === null) return false;
  const x = v as Record<string, unknown>;
  return x.ok === true && typeof x.depositAddress === "string";
}
function isErrorJson(v: unknown): v is RawDepositApiError {
  if (typeof v !== "object" || v === null) return false;
  const x = v as Record<string, unknown>;
  return (
    x.ok === false ||
    (typeof x.ok === "undefined" && typeof x.message === "string")
  );
}

export interface UseDepositAddressState {
  loading: boolean;
  error: string | null;
  payload: DepositAddressPayload | null;
}
export interface UseDepositAddressResult extends UseDepositAddressState {
  refresh: () => Promise<void>;
}

export function useDepositAddress(): UseDepositAddressResult {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("wallet.deposit");

  const [state, setState] = useState<UseDepositAddressState>({
    loading: true,
    error: null,
    payload: null,
  });

  const mountedRef = useRef<boolean>(false);
  const fetchedRef = useRef<boolean>(false);

  const fetchOnce = useCallback(async () => {
    if (fetchedRef.current) return;

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const r = await fetch("/api/wallet/deposit", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });

      if (r.status === 401) {
        if (mountedRef.current) {
          router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      const txt = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(txt);
      } catch {
        /* non-JSON body */
      }

      if (!r.ok) {
        const msg = (isErrorJson(json) && json.message) || `HTTP ${r.status}`; // 서버 메시지 우선
        throw new Error(msg);
      }

      if (!isSuccessJson(json)) {
        const msg =
          (isErrorJson(json) && json.message) || "Invalid response payload";
        throw new Error(msg);
      }

      fetchedRef.current = true;

      if (!mountedRef.current) return;
      setState({
        loading: false,
        error: null,
        payload: {
          depositAddress: json.depositAddress,
          network: "BEP-20",
        },
      });
    } catch (e) {
      if (!mountedRef.current) return;
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : t("header.preparing");
      setState({ loading: false, error: msg, payload: null });
    }
  }, [pathname, router, t]);

  useEffect(() => {
    mountedRef.current = true;
    fetchOnce();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchOnce]);

  const refresh = useCallback(async () => {
    fetchedRef.current = false;
    await fetchOnce();
  }, [fetchOnce]);

  return { ...state, refresh };
}
