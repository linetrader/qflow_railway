// src/app/[locale]/(site)/packages/hooks/usePackagesData.ts
"use client";

import type {
  ApiHistoryItem,
  ApiPackage,
  PackagesGetResp,
} from "@/types/packages";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasOkTrue(v: unknown): v is { ok: true } {
  return isRecord(v) && v.ok === true;
}

export function usePackagesData() {
  const t = useTranslations("packages");

  const [qaiPrice, setQaiPrice] = useState<number | null>(null);
  const [apiLoading, setApiLoading] = useState<boolean>(true);
  const [apiErr, setApiErr] = useState<string | null>(null);
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [history, setHistory] = useState<ApiHistoryItem[]>([]);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);

  const fetchPackages = useCallback(async (): Promise<void> => {
    setApiLoading(true);
    setApiErr(null);
    try {
      const r = await fetch("/api/packages", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });

      const text = await r.text();
      let j: unknown = null;
      try {
        j = JSON.parse(text);
      } catch {
        /* ignore */
      }

      if (!r.ok || !hasOkTrue(j)) {
        const msg =
          (isRecord(j) && typeof j.message === "string" && j.message) ||
          t("errors.fetchFailed", { status: r.status });
        throw new Error(msg);
      }

      const obj = j as PackagesGetResp;
      const okObj = obj as Extract<PackagesGetResp, { ok: true }>;

      const list: ApiPackage[] = Array.isArray(okObj.packages)
        ? okObj.packages
        : [];
      setPackages(list);

      setHistory(Array.isArray(okObj.history) ? okObj.history : []);
      setUsdtBalance(
        typeof okObj.usdtBalance === "number" ? okObj.usdtBalance : 0
      );
      setQaiPrice(typeof okObj.qaiPrice === "number" ? okObj.qaiPrice : null);
    } catch (e: unknown) {
      setApiErr(e instanceof Error ? e.message : t("errors.network"));
    } finally {
      setApiLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  return {
    qaiPrice,
    apiLoading,
    apiErr,
    packages,
    history,
    usdtBalance,
    fetchPackages,
  };
}
