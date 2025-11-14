// src/app/[locale]/(site)/wallet/withdraw/hooks/useWalletAndPrices.ts
"use client";

import type { Balances, Prices, TokenSymbol } from "@/types/common";
import type { PricesResponse, WalletResponse } from "@/types/wallet";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export interface WalletPricesState {
  loading: boolean;
  error: string | null;
  balances: Balances;
  prices: Prices;
}

export interface UseWalletPricesResult extends WalletPricesState {
  refresh: () => Promise<void>;
}

function numberOr(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toPriceRow(
  resp: PricesResponse | null,
  sym: TokenSymbol
): { price: number; withdrawFee: number } {
  const price = numberOr(
    resp?.ok === true ? resp.prices?.[sym]?.price : undefined,
    sym === "USDT" ? 1 : 0
  );
  const withdrawFee = numberOr(
    resp?.ok === true ? resp.prices?.[sym]?.withdrawFee : undefined,
    0
  );
  return { price, withdrawFee };
}

export function useWalletAndPrices(): UseWalletPricesResult {
  const t = useTranslations("wallet.withdraw");
  const [state, setState] = useState<WalletPricesState>({
    loading: true,
    error: null,
    balances: { USDT: 0, QAI: 0, DFT: 0 },
    prices: {
      USDT: { price: 1, withdrawFee: 0 },
      QAI: { price: 0, withdrawFee: 0 },
      DFT: { price: 0, withdrawFee: 0 },
    },
  });

  const mountedRef = useRef<boolean>(false);
  const fetchingRef = useRef<boolean>(false);

  const fetchAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [wbRes, prRes] = await Promise.all([
        fetch("/api/wallet", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          credentials: "same-origin",
        }),
        fetch("/api/coin/prices?tokens=USDT,QAI,DFT", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          credentials: "same-origin",
        }),
      ]);

      const [wbText, prText] = await Promise.all([wbRes.text(), prRes.text()]);

      let wbJson: WalletResponse | null = null;
      let prJson: PricesResponse | null = null;
      try {
        wbJson = wbText ? (JSON.parse(wbText) as WalletResponse) : null;
      } catch {
        /* noop */
      }
      try {
        prJson = prText ? (JSON.parse(prText) as PricesResponse) : null;
      } catch {
        /* noop */
      }

      if (!wbRes.ok || !wbJson || wbJson.ok !== true) {
        const msg =
          (wbJson &&
            "message" in wbJson &&
            (wbJson as { message?: string }).message) ||
          `HTTP ${wbRes.status}`;
        throw new Error(msg);
      }

      if (!prRes.ok || !prJson || prJson.ok !== true) {
        const msg =
          (prJson &&
            "message" in prJson &&
            (prJson as { message?: string }).message) ||
          `HTTP ${prRes.status}`;
        throw new Error(msg);
      }

      const nextBalances: Balances = {
        USDT: numberOr(wbJson.balances?.USDT, 0),
        QAI: numberOr(wbJson.balances?.QAI, 0),
        DFT: numberOr(wbJson.balances?.DFT, 0),
      };

      const nextPrices: Prices = {
        USDT: toPriceRow(prJson, "USDT"),
        QAI: toPriceRow(prJson, "QAI"),
        DFT: toPriceRow(prJson, "DFT"),
      };

      if (!mountedRef.current) return;
      setState({
        loading: false,
        error: null,
        balances: nextBalances,
        prices: nextPrices,
      });
    } catch (e) {
      if (!mountedRef.current) return;
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : t("error.badge");
      setState((s) => ({ ...s, loading: false, error: msg }));
    } finally {
      fetchingRef.current = false;
    }
  }, [t]);

  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchAll]);

  return { ...state, refresh };
}
