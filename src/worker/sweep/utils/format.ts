// src/worker/sweep/utils/format.ts

import { Prisma } from "@/generated/prisma";
import { ethers } from "ethers";

export function toDecimalFromBigint(
  value: bigint,
  decimals: number
): Prisma.Decimal {
  const num = new Prisma.Decimal(value.toString());
  const denom = new Prisma.Decimal(10).pow(decimals);
  return num.div(denom);
}

export function fmtBNB(wei: bigint) {
  return ethers.formatEther(wei);
}
