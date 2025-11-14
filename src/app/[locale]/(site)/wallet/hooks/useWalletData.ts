// src/app/[locale]/(site)/wallet/hooks/useWalletData.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WalletBalances, Tx, HistoryApiOk } from "@/types/wallet";
import {
  isHistoryApi,
  isWalletApi,
  isTxArrayItem,
  pickMessage,
} from "@/types/wallet/guards";
import type { TokenSymbol } from "@/types/common";
import { useToast } from "@/components/ui/feedback/Toast-provider";
import { useTranslations } from "next-intl";

const PAGE_SIZE = 20;

function normalizeBalances(
  b: Partial<Record<TokenSymbol, number>> | undefined | null
): WalletBalances {
  return {
    USDT: typeof b?.USDT === "number" && Number.isFinite(b.USDT) ? b.USDT : 0,
    QAI: typeof b?.QAI === "number" && Number.isFinite(b.QAI) ? b.QAI : 0,
    DFT: typeof b?.DFT === "number" && Number.isFinite(b.DFT) ? b.DFT : 0,
  };
}

export function useWalletData() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("wallet");

  const [balances, setBalances] = useState<WalletBalances>({
    USDT: 0,
    QAI: 0,
    DFT: 0,
  });
  const [history, setHistory] = useState<Tx[]>([]);
  const [histNext, setHistNext] = useState<HistoryApiOk["nextCursor"]>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [wbRes, histRes] = await Promise.all([
          fetch("/api/wallet", {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
            credentials: "same-origin",
          }),
          fetch(`/api/wallet/history?limit=${PAGE_SIZE}`, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
            credentials: "same-origin",
          }),
        ]);

        if (wbRes.status === 401 || histRes.status === 401) {
          toast({
            title: t("error.loginReqTitle"),
            description: t("error.loginReqDesc"),
            variant: "warning",
            position: "top-right",
            duration: 2000,
            closable: true,
          });
          router.push("/auth/login?next=/wallet");
          return;
        }

        const [wbText, histText] = await Promise.all([
          wbRes.text(),
          histRes.text(),
        ]);

        let wbParsed: unknown = null;
        try {
          wbParsed = JSON.parse(wbText) as unknown;
        } catch {
          wbParsed = null;
        }

        let histParsed: unknown = null;
        try {
          histParsed = JSON.parse(histText) as unknown;
        } catch {
          histParsed = null;
        }

        if (!wbRes.ok || !isWalletApi(wbParsed) || wbParsed.ok !== true) {
          const msg = pickMessage(wbParsed) || `HTTP ${wbRes.status}`;
          throw new Error(msg);
        }
        if (
          !histRes.ok ||
          !isHistoryApi(histParsed) ||
          histParsed.ok !== true
        ) {
          const msg = pickMessage(histParsed) || `HTTP ${histRes.status}`;
          throw new Error(msg);
        }

        if (!ignore) {
          setBalances(normalizeBalances(wbParsed.balances));
          const items = (histParsed.items as unknown[]).filter(isTxArrayItem);
          setHistory(items);
          setHistNext((histParsed as HistoryApiOk).nextCursor);
        }
      } catch (e: unknown) {
        if (!ignore) {
          const msg =
            e instanceof Error
              ? e.message
              : typeof e === "string"
              ? e
              : t("error.unknown");
          setErr(msg);
          toast({
            title: t("error.title"),
            description: msg,
            variant: "error",
            position: "top-right",
            duration: 2400,
            closable: true,
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [router, toast, t]);

  async function loadMore(): Promise<void> {
    if (!histNext) return;
    try {
      setLoading(true);
      setErr(null);

      const usp = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (histNext.ts) usp.set("cursorTs", histNext.ts);
      if (histNext.id) usp.set("cursorId", String(histNext.id));

      const r = await fetch(`/api/wallet/history?${usp.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });

      if (r.status === 401) {
        toast({
          title: t("error.loginReqTitle"),
          description: t("error.loginReqDesc"),
          variant: "warning",
          position: "top-right",
          duration: 2000,
          closable: true,
        });
        router.push("/auth/login?next=/wallet");
        return;
      }

      const txt = await r.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(txt) as unknown;
      } catch {
        parsed = null;
      }

      if (!r.ok || !isHistoryApi(parsed) || parsed.ok !== true) {
        const msg = pickMessage(parsed) || `HTTP ${r.status}`;
        throw new Error(msg);
      }

      const items = (parsed.items as unknown[]).filter(isTxArrayItem);
      setHistory((prev) => [...prev, ...items]);
      setHistNext((parsed as HistoryApiOk).nextCursor);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
          ? e
          : t("error.unknown");
      setErr(msg);
      toast({
        title: t("error.title"),
        description: msg,
        variant: "error",
        position: "top-right",
        duration: 2400,
        closable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  return { balances, history, histNext, loading, err, loadMore } as const;
}
