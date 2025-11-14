// src/app/[locale]/(site)/wallet/withdraw/hooks/useWithdraw.ts
"use client";

import type { Balances, TokenSymbol } from "@/types/common";
import type { WithdrawResponse } from "@/types/wallet";
import { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/ui/feedback/Toast-provider";
import { useTranslations } from "next-intl";

export interface UseWithdrawResult {
  submitting: boolean;
  submit: (
    token: TokenSymbol,
    amount: number
  ) => Promise<{
    ok: boolean;
    message: string;
    nextBalances?: Partial<Balances>;
  }>;
}

export function useWithdraw(): UseWithdrawResult {
  const { toast } = useToast();
  const t = useTranslations("wallet.withdraw");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const inFlightRef = useRef<boolean>(false);

  const submit = useCallback(
    async (token: TokenSymbol, amount: number) => {
      if (inFlightRef.current) {
        const message = t("toast.processing");
        toast({
          title: t("loading.title"),
          description: message,
          variant: "warning",
          position: "top-right",
          duration: 1600,
          closable: true,
        });
        return { ok: false, message };
      }
      inFlightRef.current = true;
      setSubmitting(true);

      try {
        const r = await fetch("/api/wallet/withdraw", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ token, amount }),
        });

        const text = await r.text();
        let json: WithdrawResponse | null = null;
        try {
          json = text ? (JSON.parse(text) as WithdrawResponse) : null;
        } catch {
          json = null;
        }

        if (!r.ok || !json || json.ok !== true) {
          const code =
            (json && "code" in json
              ? (json as { code?: string }).code
              : undefined) || undefined;
          const message =
            (json && "message" in json
              ? (json as { message?: string }).message
              : undefined) ||
            (code === "NO_WITHDRAW_ADDRESS"
              ? "No withdraw address"
              : code === "INSUFFICIENT_BALANCE"
              ? "Insufficient balance"
              : code === "INVALID_AMOUNT"
              ? "Invalid amount"
              : t("toast.withdrawFailTitle"));

          toast({
            title: t("toast.withdrawFailTitle"),
            description: message,
            variant: "error",
            position: "top-right",
            duration: 2200,
            closable: true,
          });
          return { ok: false, message };
        }

        const nextBalances = json.balances;
        const message = t("toast.withdrawOkDesc");
        toast({
          title: t("toast.withdrawOkTitle"),
          description: message,
          variant: "success",
          position: "top-right",
          duration: 2000,
          closable: true,
        });
        return {
          ok: true,
          message,
          nextBalances,
        };
      } catch {
        const message = t("toast.networkErrorTitle");
        toast({
          title: t("toast.networkErrorTitle"),
          description: message,
          variant: "error",
          position: "top-right",
          duration: 2200,
          closable: true,
        });
        return { ok: false, message };
      } finally {
        inFlightRef.current = false;
        setSubmitting(false);
      }
    },
    [toast, t]
  );

  return { submitting, submit } as const;
}
