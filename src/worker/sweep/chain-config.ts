// src/worker/sweep/chain-config.ts
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getAddress, isAddress } from "ethers";
//import type { Prisma } from "@prisma/client"; // ✅ Prisma 타입만 import

export type ChainConfig = {
  id: "BSC_TESTNET" | "BSC_MAINNET" | string;
  rpcUrl: string;
  usdtAddress: `0x${string}`;
  dftAddress?: `0x${string}` | null;
  confirmations: number;
  scanBatch: number;
  bnbMinForSweep: string; // Decimal → 문자열로 반환
  intervalMs: number;
  balanceConcurrency: number;
  balanceLogEveryN: number;
  sweepIfUsdtGtZero: boolean;
};

export async function loadActiveChainConfig(): Promise<ChainConfig> {
  const kv = await prisma.systemKV.findFirst({
    select: { key: true, value: true },
  });

  const fallbackId = "BSC_MAINNET";
  const fallbackInterval = 8_000;
  const id = kv?.key ?? fallbackId;

  let intervalMs = fallbackInterval;
  if (kv?.value) {
    const n = Number.parseInt(kv.value, 10);
    if (Number.isFinite(n)) intervalMs = Math.min(Math.max(n, 1_000), 300_000);
  }

  // ✅ Prisma가 생성한 payload 타입을 그대로 사용
  type WithDft = Prisma.AdminChainConfigGetPayload<{
    select: {
      id: true;
      rpcUrl: true;
      usdtAddress: true;
      dftAddress: true;
      confirmations: true;
      scanBatch: true;
      bnbMinForSweep: true;
      isEnabled: true;
      balanceConcurrency: true;
      balanceLogEveryN: true;
      sweepIfUsdtGtZero: true;
    };
  }>;
  type NoDft = Prisma.AdminChainConfigGetPayload<{
    select: {
      id: true;
      rpcUrl: true;
      usdtAddress: true;
      confirmations: true;
      scanBatch: true;
      bnbMinForSweep: true;
      isEnabled: true;
      balanceConcurrency: true;
      balanceLogEveryN: true;
      sweepIfUsdtGtZero: true;
    };
  }>;

  let row: (WithDft | (NoDft & { dftAddress: null })) | null = null;

  try {
    row = await prisma.adminChainConfig.findUnique({
      where: { id },
      select: {
        id: true,
        rpcUrl: true,
        usdtAddress: true,
        dftAddress: true, // 신스키마
        confirmations: true,
        scanBatch: true,
        bnbMinForSweep: true, // ✅ Prisma.Decimal
        isEnabled: true,
        balanceConcurrency: true,
        balanceLogEveryN: true,
        sweepIfUsdtGtZero: true,
      },
    });
  } catch {
    // ✅ 변수명 생략하여 no-unused-vars 회피
    const legacy = await prisma.adminChainConfig.findUnique({
      where: { id },
      select: {
        id: true,
        rpcUrl: true,
        usdtAddress: true,
        confirmations: true,
        scanBatch: true,
        bnbMinForSweep: true, // ✅ Prisma.Decimal
        isEnabled: true,
        balanceConcurrency: true,
        balanceLogEveryN: true,
        sweepIfUsdtGtZero: true,
      },
    });
    if (legacy) row = { ...legacy, dftAddress: null }; // ✅ any 캐스팅 없이 병합
  }

  if (!row || !row.isEnabled) {
    throw new Error(`Chain config not available: ${id}`);
  }

  const usdtAddr = getAddress(row.usdtAddress) as `0x${string}`;
  const dftAddr =
    row.dftAddress && isAddress(row.dftAddress)
      ? (getAddress(row.dftAddress) as `0x${string}`)
      : null;

  // ✅ Prisma.Decimal → 문자열
  const bnbMinForSweep = (row.bnbMinForSweep as Prisma.Decimal).toString();

  const balanceConcurrency =
    Number.isFinite(row.balanceConcurrency ?? NaN) &&
    (row.balanceConcurrency as number) > 0
      ? (row.balanceConcurrency as number)
      : 25;

  const balanceLogEveryN =
    Number.isFinite(row.balanceLogEveryN ?? NaN) &&
    (row.balanceLogEveryN as number) > 0
      ? (row.balanceLogEveryN as number)
      : 200;

  const sweepIfUsdtGtZero = !!row.sweepIfUsdtGtZero;

  return {
    id,
    rpcUrl: row.rpcUrl,
    usdtAddress: usdtAddr,
    dftAddress: dftAddr,
    confirmations: row.confirmations,
    scanBatch: row.scanBatch,
    bnbMinForSweep,
    intervalMs,
    balanceConcurrency,
    balanceLogEveryN,
    sweepIfUsdtGtZero,
  };
}
