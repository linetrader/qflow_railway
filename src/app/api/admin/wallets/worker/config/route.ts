// src/app/api/admin/wallets/worker/config/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  withTimeout,
  statusFromError,
  messageFromError,
} from "@/app/api/utils/withTimeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_TIMEOUT_MS = 15_000;

const evmAddress = /^0x[a-fA-F0-9]{40}$/;
const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/);

const ChainConfigUpsertSchema = z.object({
  id: z.string().trim().min(1),
  rpcUrl: z.string().trim().url(),
  usdtAddress: z.string().trim().regex(evmAddress, "Invalid USDT address"),
  dftAddress: z
    .string()
    .trim()
    .regex(evmAddress, "Invalid DFT address")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length ? v : null)),
  confirmations: z.coerce.number().int().min(0).default(15),
  scanBatch: z.coerce.number().int().min(1).default(2000),
  bnbMinForSweep: z
    .union([z.coerce.number(), z.string()])
    .transform((v) => String(v).trim())
    .pipe(decimalString)
    .default("0.001"),
  isEnabled: z.coerce.boolean().default(true),
  balanceConcurrency: z.coerce.number().int().min(1).default(25),
  balanceLogEveryN: z.coerce.number().int().min(1).default(200),
  sweepIfUsdtGtZero: z.coerce.boolean().default(false),
});

export async function GET() {
  try {
    const rows = await withTimeout(
      prisma.adminChainConfig.findMany({ orderBy: { id: "asc" } }),
      API_TIMEOUT_MS,
      "adminChainConfig.findMany"
    );
    return NextResponse.json({ ok: true, rows });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        code: statusFromError(e) === 504 ? "UPSTREAM_TIMEOUT" : "UNKNOWN",
        message: messageFromError(e),
      },
      { status: statusFromError(e) }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = ChainConfigUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "INVALID_INPUT", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const row = await withTimeout(
      prisma.adminChainConfig.upsert({
        where: { id: d.id },
        create: {
          id: d.id,
          rpcUrl: d.rpcUrl,
          usdtAddress: d.usdtAddress,
          dftAddress: d.dftAddress,
          confirmations: d.confirmations,
          scanBatch: d.scanBatch,
          bnbMinForSweep: d.bnbMinForSweep,
          isEnabled: d.isEnabled,
          balanceConcurrency: d.balanceConcurrency,
          balanceLogEveryN: d.balanceLogEveryN,
          sweepIfUsdtGtZero: d.sweepIfUsdtGtZero,
        },
        update: {
          rpcUrl: d.rpcUrl,
          usdtAddress: d.usdtAddress,
          dftAddress: d.dftAddress,
          confirmations: d.confirmations,
          scanBatch: d.scanBatch,
          bnbMinForSweep: d.bnbMinForSweep,
          isEnabled: d.isEnabled,
          balanceConcurrency: d.balanceConcurrency,
          balanceLogEveryN: d.balanceLogEveryN,
          sweepIfUsdtGtZero: d.sweepIfUsdtGtZero,
        },
      }),
      API_TIMEOUT_MS,
      "adminChainConfig.upsert"
    );

    return NextResponse.json({ ok: true, row });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        code: statusFromError(e) === 504 ? "UPSTREAM_TIMEOUT" : "UNKNOWN",
        message: messageFromError(e),
      },
      { status: statusFromError(e) }
    );
  }
}
