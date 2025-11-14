// src/app/[locale]/(site)/packages/hooks/usePurchaseCalc.ts
"use client";

import type { ApiPackage, PackageQtyMap } from "@/types/packages";
import { useMemo } from "react";

export type PurchaseCalcInput = {
  packages: ApiPackage[];
  qtyById: PackageQtyMap;
  submitting: boolean;
  usdtBalance: number;
  qaiPrice: number | null;
};

export type PurchaseCalcOutput = {
  totalUSD: number;
  estQai: number;
  canBuy: boolean;
  insufficient: boolean;
};

const sanitizeNumericString = (v: string): string => v.replace(/\D/g, "");
const toNumber = (v: string | number | null | undefined): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export function usePurchaseCalc({
  packages,
  qtyById,
  submitting,
  usdtBalance,
  qaiPrice,
}: PurchaseCalcInput): PurchaseCalcOutput {
  return useMemo(() => {
    let total = 0;
    for (const p of packages) {
      const raw = qtyById[p.id] ?? "";
      const n = toNumber(sanitizeNumericString(String(raw)));
      total += n * toNumber(p.price);
    }

    const canBuy = total > 0 && !submitting;
    const insufficient = total > toNumber(usdtBalance);
    const estQai =
      typeof qaiPrice === "number" && qaiPrice > 0 ? total / qaiPrice : 0;

    return { totalUSD: total, estQai, canBuy, insufficient };
  }, [packages, qtyById, submitting, usdtBalance, qaiPrice]);
}

export const PurchaseCalcUtils = { sanitizeNumericString, toNumber };
