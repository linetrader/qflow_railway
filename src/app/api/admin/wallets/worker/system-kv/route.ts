// src/app/api/admin/wallets/worker/system-kv/route.ts
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

const API_TIMEOUT_MS = 12_000;

const ALLOWED_KEYS = ["BSC_MAINNET", "BSC_TESTNET"] as const;
type AllowedKey = (typeof ALLOWED_KEYS)[number];

const UpsertSchema = z.object({
  key: z.enum(ALLOWED_KEYS),
  value: z.string().default(""),
});

/**
 * GET /api/admin/wallets/worker/system-kv
 * - 허용된 키 중 최신 1개를 활성으로 반환
 * - 없으면 기본값(BSC_MAINNET, value:"")을 반환(생성은 하지 않음)
 */
export async function GET() {
  try {
    const rows = await withTimeout(
      prisma.systemKV.findMany({
        where: { key: { in: [...ALLOWED_KEYS] } },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { key: true, value: true, updatedAt: true },
      }),
      API_TIMEOUT_MS,
      "systemKV.findMany(system-kv:get)"
    );

    const active = rows[0]
      ? {
          key: rows[0].key as AllowedKey,
          value: rows[0].value,
          updatedAt: rows[0].updatedAt.toISOString(),
        }
      : ({
          key: "BSC_MAINNET",
          value: "",
          updatedAt: "",
        } as const);

    return NextResponse.json({
      ok: true as const,
      active,
      allowed: ALLOWED_KEYS,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false as const,
        code: statusFromError(e) === 504 ? "UPSTREAM_TIMEOUT" : "UNKNOWN",
        message: messageFromError(e),
      },
      { status: statusFromError(e) }
    );
  }
}

/**
 * PUT /api/admin/wallets/worker/system-kv
 * body: { key, value }
 * - 트랜잭션으로 선택한 key만 남기고(other 삭제) upsert
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = UpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false as const,
          code: "INVALID_INPUT",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }
    const { key, value } = parsed.data;
    const otherKeys = (ALLOWED_KEYS as readonly string[]).filter(
      (k) => k !== key
    );

    const upserted = await withTimeout(
      prisma.$transaction(async (tx) => {
        if (otherKeys.length > 0) {
          await tx.systemKV.deleteMany({ where: { key: { in: otherKeys } } });
        }
        return tx.systemKV.upsert({
          where: { key },
          create: { key, value },
          update: { value },
          select: { key: true, value: true, updatedAt: true },
        });
      }),
      API_TIMEOUT_MS,
      "systemKV.transaction(system-kv:put)"
    );

    return NextResponse.json({
      ok: true as const,
      active: {
        key: upserted.key as AllowedKey,
        value: upserted.value,
        updatedAt: upserted.updatedAt.toISOString(),
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false as const,
        code: statusFromError(e) === 504 ? "UPSTREAM_TIMEOUT" : "UNKNOWN",
        message: messageFromError(e),
      },
      { status: statusFromError(e) }
    );
  }
}

/** DELETE 비활성화 (항상 1개 유지 규칙) */
export async function DELETE() {
  return NextResponse.json(
    {
      ok: false as const,
      code: "METHOD_DISABLED",
      message: "Delete is not allowed.",
    },
    { status: 405 }
  );
}
