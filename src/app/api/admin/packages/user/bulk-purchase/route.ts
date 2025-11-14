// src/app/api/admin/packages/bulk-purchase/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { purchaseForUser } from "./purchase-query";
import { enqueueLevelRecalcJob } from "@/worker/level-recalc/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ItemSchema = z.object({
  packageId: z.string().min(1),
  units: z.number().int().positive(),
});

const BodySchema = z
  .object({
    prefix: z.string().trim().min(1).default("test"),
    pad: z.number().int().min(0).default(3),
    start: z.number().int().optional(),
    end: z.number().int().optional(),
    dry: z.boolean().default(false),
    limit: z.number().int().positive().optional(),
    items: z.array(ItemSchema).optional(),
    packageId: z.string().min(1).optional(),
    units: z.number().int().positive().optional(),
  })
  .strict();

function inRangeBySuffix(
  username: string,
  prefix: string,
  _pad: number, // pad는 형식 검증용으로만 전달되었고 실제 범위 필터엔 불필요
  start?: number,
  end?: number
): boolean {
  if (start === undefined && end === undefined) return true;
  if (!username.startsWith(prefix)) return false;
  const tail = username.slice(prefix.length);
  if (!/^\d+$/.test(tail)) return false;
  const n = Number(tail);
  if (Number.isNaN(n)) return false;
  if (start !== undefined && n < start) return false;
  if (end !== undefined && n > end) return false;
  return true;
}

function normalizeItems(
  body: z.infer<typeof BodySchema>
): ReadonlyArray<{ packageId: string; units: number }> {
  const items =
    body.items ??
    (body.packageId
      ? [{ packageId: body.packageId, units: body.units ?? 1 }]
      : []);
  return items;
}

export async function POST(req: Request) {
  try {
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_INPUT", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const items = normalizeItems(body);
    if (items.length === 0) {
      return NextResponse.json(
        { error: "INVALID_INPUT", errorMessage: "items 또는 packageId 필요" },
        { status: 400 }
      );
    }

    const useAll = body.start === undefined && body.end === undefined;

    // useAll이어도 limit 주어지면 적용(대규모 셋 보호)
    const users = await prisma.user.findMany({
      where: { username: { startsWith: body.prefix } },
      select: { id: true, username: true },
      orderBy: { username: "asc" },
      ...(useAll
        ? body.limit
          ? { take: body.limit }
          : {}
        : { take: body.limit ?? 5000 }),
    });

    const targets = useAll
      ? users
      : users.filter((u) =>
          inRangeBySuffix(
            u.username,
            body.prefix,
            body.pad,
            body.start,
            body.end
          )
        );

    if (targets.length === 0) {
      return NextResponse.json({
        items: [],
        total: 0,
        success: 0,
        fail: 0,
        message: "대상 사용자 없음",
      });
    }

    if (body.dry) {
      return NextResponse.json({
        dry: true as const,
        targets: targets.map((t) => t.username),
        count: targets.length,
      });
    }

    let success = 0;
    let fail = 0;
    const results: Array<{
      username: string;
      ok: boolean;
      message?: string;
      totalUSD?: string;
    }> = [];

    // 직렬 처리(필요 시 병렬화 가능하나, 실패원인 추적/락 경합 방지 위해 직렬 권장)
    for (const u of targets) {
      try {
        const res = await purchaseForUser(prisma, u.id, items);
        results.push({
          username: u.username,
          ok: true,
          totalUSD: res.totalUSD,
        });

        if (res.historyIds.length > 0) {
          await enqueueLevelRecalcJob({
            userId: u.id,
            reason: "purchase",
            payload: { historyIds: res.historyIds },
            payloadKeyForDedupe: res.historyIds.join(","),
          });
        }
        success++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ username: u.username, ok: false, message: msg });
        fail++;
      }
    }

    return NextResponse.json({
      items: results,
      total: targets.length,
      success,
      fail,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", errorMessage: message },
      { status: 500 }
    );
  }
}
