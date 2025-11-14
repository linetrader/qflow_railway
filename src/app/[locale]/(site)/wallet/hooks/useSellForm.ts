// src/app/[locale]/(site)/wallet/hooks/useSellForm.ts
"use client";

import { useMemo, useState } from "react";
import { DFT_PRICE_USDT } from "@/types/wallet";
import { useToast } from "@/components/ui/feedback/Toast-provider";
import { useTranslations } from "next-intl";

export type SellFormState = {
  sellAmtInput: string;
  setSellAmtInput: (v: string) => void;
  isValid: boolean;
  amount: number;
  total: number;
  submit: () => { message: string; ok: boolean } | null;
  toastOpen: boolean;
  toastMsg: string;
  closeToast: () => void;
};

export function useSellForm(dftBalance: number): SellFormState {
  const { toast } = useToast();
  const t = useTranslations("wallet.sell");

  const [sellAmtInput, setSellAmtInput] = useState<string>("");
  const [toastOpen, setToastOpen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");

  const amount = useMemo<number>(() => {
    const n = Number(sellAmtInput.replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }, [sellAmtInput]);

  const total = useMemo<number>(
    () => (Number.isFinite(amount) ? amount * DFT_PRICE_USDT : 0),
    [amount]
  );

  const isValid = Number.isFinite(amount) && amount > 0 && amount <= dftBalance;

  function submit(): { message: string; ok: boolean } | null {
    if (!isValid) return null;

    const message = `${t("title")}: ${t(
      "qty"
    )} ${amount.toLocaleString()} DFT, ${t(
      "unit"
    )} ${DFT_PRICE_USDT.toLocaleString()} USDT, ${t(
      "total"
    )} ${total.toLocaleString()} USDT`;

    toast({
      title: t("toastOkTitle"),
      description: t("toastOkDesc"),
      variant: "success",
      position: "top-right",
      duration: 2200,
      closable: true,
    });

    setToastMsg(message);
    setToastOpen(true);

    return { message, ok: true };
  }

  function closeToast(): void {
    setToastOpen(false);
  }

  return {
    sellAmtInput,
    setSellAmtInput,
    isValid,
    amount,
    total,
    submit,
    toastOpen,
    toastMsg,
    closeToast,
  };
}
