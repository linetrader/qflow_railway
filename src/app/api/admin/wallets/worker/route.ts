// src/app/api/admin/wallets/worker/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  withTimeout,
  allWithTimeout,
  statusFromError,
  messageFromError,
} from "@/app/api/utils/withTimeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_TIMEOUT_MS = 15_000;

const KV_KEYS = {
  BALANCE_ENABLED: "WORKER_BALANCE_ENABLED",
  SWEEP_ENABLED: "WORKER_SWEEP_ENABLED",
  BALANCE_LAST_RUN_AT: "WORKER_BALANCE_LAST_RUN_AT",
  SWEEP_LAST_RUN_AT: "WORKER_SWEEP_LAST_RUN_AT",
  BALANCE_KICK: "WORKER_BALANCE_KICK",
  SWEEP_KICK: "WORKER_SWEEP_KICK",
} as const;

const PatchSchema = z.object({
  balanceEnabled: z.boolean().optional(),
  sweepEnabled: z.boolean().optional(),
  kickBalance: z.boolean().optional(),
  kickSweep: z.boolean().optional(),
});

type KvRow = { key: string; value: string; updatedAt: Date };

function kvUpsert(key: string, value: string): Promise<KvRow> {
  return prisma.systemKV.upsert({
    where: { key },
    create: { key, value },
    update: { value },
    select: { key: true, value: true, updatedAt: true },
  });
}

async function kvRead(keys: string[]) {
  const rows = await withTimeout(
    prisma.systemKV.findMany({ where: { key: { in: keys } } }),
    API_TIMEOUT_MS,
    "systemKV.findMany"
  );
  const map = new Map(rows.map((r) => [r.key, r]));
  return keys.reduce<
    Record<string, { value: string; updatedAt: string } | null>
  >((acc, k) => {
    const r = map.get(k);
    acc[k] = r
      ? { value: r.value, updatedAt: r.updatedAt.toISOString() }
      : null;
    return acc;
  }, {});
}

export async function GET() {
  try {
    const kv = await kvRead(Object.values(KV_KEYS));
    const parseBool = (v: string | undefined | null) =>
      v === "1" || v === "true";
    return NextResponse.json({
      ok: true,
      status: {
        balanceEnabled: parseBool(kv[KV_KEYS.BALANCE_ENABLED]?.value ?? null),
        sweepEnabled: parseBool(kv[KV_KEYS.SWEEP_ENABLED]?.value ?? null),
        balanceLastRunAt: kv[KV_KEYS.BALANCE_LAST_RUN_AT]?.value ?? null,
        sweepLastRunAt: kv[KV_KEYS.SWEEP_LAST_RUN_AT]?.value ?? null,
        pendingBalanceKick: Boolean(kv[KV_KEYS.BALANCE_KICK]?.value),
        pendingSweepKick: Boolean(kv[KV_KEYS.SWEEP_KICK]?.value),
      },
    });
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

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const p = PatchSchema.safeParse(body);
    if (!p.success) {
      return NextResponse.json(
        { ok: false, code: "INVALID_INPUT", issues: p.error.issues },
        { status: 400 }
      );
    }
    const { balanceEnabled, sweepEnabled, kickBalance, kickSweep } = p.data;

    const jobs: Array<Promise<unknown>> = [];
    if (typeof balanceEnabled === "boolean") {
      jobs.push(kvUpsert(KV_KEYS.BALANCE_ENABLED, balanceEnabled ? "1" : "0"));
    }
    if (typeof sweepEnabled === "boolean") {
      jobs.push(kvUpsert(KV_KEYS.SWEEP_ENABLED, sweepEnabled ? "1" : "0"));
    }
    const nowIso = new Date().toISOString();
    if (kickBalance) jobs.push(kvUpsert(KV_KEYS.BALANCE_KICK, nowIso));
    if (kickSweep) jobs.push(kvUpsert(KV_KEYS.SWEEP_KICK, nowIso));

    await allWithTimeout(jobs, API_TIMEOUT_MS, "systemKV.upserts");
    return NextResponse.json({ ok: true });
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
