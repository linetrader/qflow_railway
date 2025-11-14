// app/api/admin/mining/dftPayouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getUserId } from "@/lib/request-user";

type Decimalish = number | string | { toString(): string } | null | undefined;
const toNum = (v: Decimalish): number => {
  if (v == null) return 0;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : 0;
};

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().min(1).optional(),
  username: z.string().min(1).optional(), // ← username 검색 추가
  search: z.string().min(1).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  hasMiningPayout: z.enum(["yes", "no", "all"]).default("all").optional(),
  sort: z
    .enum(["createdAt_desc", "createdAt_asc", "amount_desc", "amount_asc"])
    .default("createdAt_desc")
    .optional(),
});

export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  try {
    const authed = await getUserId();
    if (!authed) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED" as const },
        { status: 401 }
      );
    }

    const parsed = QuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_PARAM" as const,
          message: parsed.error.message,
        },
        { status: 400 }
      );
    }

    const q = parsed.data;

    const and: object[] = [];
    if (q.userId) and.push({ userId: q.userId });
    if (q.username) {
      // User 테이블의 username 컬럼을 기준으로 필터 (실제 컬럼명이 다르면 맞춰 변경)
      and.push({
        user: {
          username: { contains: q.username, mode: "insensitive" },
        },
      });
    }
    if (q.search) {
      and.push({
        OR: [
          { name: { contains: q.search, mode: "insensitive" } },
          { note: { contains: q.search, mode: "insensitive" } },
        ],
      });
    }
    if (q.dateFrom) and.push({ createdAt: { gte: new Date(q.dateFrom) } });
    if (q.dateTo) and.push({ createdAt: { lte: new Date(q.dateTo) } });
    if (q.hasMiningPayout === "yes")
      and.push({ NOT: { miningPayoutId: null } });
    if (q.hasMiningPayout === "no") and.push({ miningPayoutId: null });

    const where = and.length ? { AND: and } : {};

    const orderBy =
      q.sort === "createdAt_asc"
        ? { createdAt: "asc" as const }
        : q.sort === "amount_desc"
        ? { amountDFT: "desc" as const }
        : q.sort === "amount_asc"
        ? { amountDFT: "asc" as const }
        : { createdAt: "desc" as const };

    const skip = (q.page - 1) * q.pageSize;
    const take = q.pageSize;

    // 총합(필터 반영)과 리스트/카운트를 병렬 수행
    const [agg, total, rows] = await Promise.all([
      prisma.userRewardHistory.aggregate({
        where,
        _sum: { amountDFT: true },
      }),
      prisma.userRewardHistory.count({ where }),
      prisma.userRewardHistory.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          userId: true,
          name: true,
          amountDFT: true,
          note: true,
          miningPayoutId: true,
          createdAt: true,
          user: { select: { username: true } }, // ← username 표시용
        },
      }),
    ]);

    const sumAmountDFT = toNum(agg._sum.amountDFT as Decimalish);

    const items = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      username: r.user?.username ?? undefined,
      name: r.name,
      amountDFT: toNum(r.amountDFT as Decimalish),
      note: r.note,
      miningPayoutId: r.miningPayoutId ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: { items },
      meta: { page: q.page, pageSize: q.pageSize, total, sumAmountDFT },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { ok: false, code: "INTERNAL" as const, message },
      { status: 500 }
    );
  }
}
