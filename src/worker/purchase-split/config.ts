// src/worker/purchase-split/config.ts
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export type PurchaseSplit = {
  basePct: Decimal;
  refPct: Decimal;
  centerPct: Decimal;
  levelPct: Decimal;
  companyPct: Decimal; // ← 추가
};

function inRange01(x: Decimal): boolean {
  return x.gte(0) && x.lte(100);
}

export async function loadActivePurchaseSplit(): Promise<PurchaseSplit | null> {
  const row = await prisma.purchaseSplitPolicy.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    select: {
      basePct: true,
      refPct: true,
      centerPct: true,
      levelPct: true,
      companyPct: true, // ← 추가
    },
  });
  if (!row) return null;

  const basePct = new Decimal(row.basePct as unknown as string);
  const refPct = new Decimal(row.refPct as unknown as string);
  const centerPct = new Decimal(row.centerPct as unknown as string);
  const levelPct = new Decimal(row.levelPct as unknown as string);
  const companyPct = new Decimal(row.companyPct as unknown as string);

  if (
    !inRange01(basePct) ||
    !inRange01(refPct) ||
    !inRange01(centerPct) ||
    !inRange01(levelPct) ||
    !inRange01(companyPct)
  )
    return null;

  return { basePct, refPct, centerPct, levelPct, companyPct };
}

/** 공통: 구매가 × basePct */
export function computeBaseUSD(
  purchaseUSD: Decimal,
  split: PurchaseSplit
): Decimal {
  return purchaseUSD.lte(0)
    ? new Decimal(0)
    : purchaseUSD.mul(split.basePct).div(100);
}

/** 세부 풀 계산: baseUSD × (각 비율) */
export function computeReferralUSD(
  baseUSD: Decimal,
  split: PurchaseSplit
): Decimal {
  return baseUSD.mul(split.refPct).div(100);
}
export function computeCenterUSD(
  baseUSD: Decimal,
  split: PurchaseSplit
): Decimal {
  return baseUSD.mul(split.centerPct).div(100);
}
export function computeLevelUSD(
  baseUSD: Decimal,
  split: PurchaseSplit
): Decimal {
  return baseUSD.mul(split.levelPct).div(100);
}
export function computeCompanyUSD(
  baseUSD: Decimal,
  split: PurchaseSplit
): Decimal {
  return baseUSD.mul(split.companyPct).div(100);
}
