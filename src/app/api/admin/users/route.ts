// app/api/admin/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

/** 숫자 파라미터 안전 보정 */
function toInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const i = Math.trunc(n);
  if (i < min) return def;
  if (i > max) return max;
  return i;
}

/** 정렬 화이트리스트 */
const SORT_WHITELIST = new Set([
  "createdAt:desc",
  "createdAt:asc",
  "username:asc",
  "username:desc",
  "name:asc",
  "name:desc",
  "email:asc",
  "email:desc",
  "level:desc",
  "level:asc",
]);

function normalizeSort(raw: string | null): {
  field: keyof Prisma.UserOrderByWithRelationInput;
  dir: "asc" | "desc";
} {
  const v = raw && SORT_WHITELIST.has(raw) ? raw : "createdAt:desc";
  const [field, dir] = v.split(":") as [
    keyof Prisma.UserOrderByWithRelationInput,
    "asc" | "desc"
  ];
  return { field, dir };
}

function normalizeQ(raw: string | null | undefined) {
  const q = (raw ?? "").trim();
  return q.length ? q : undefined;
}

/**
 * GET /api/admin/users
 * Query:
 *  - page (>=1, default 1)
 *  - size (1~100, default 20)
 *  - q    (username|email|name|referralCode 부분 검색)
 *  - sort (화이트리스트, default createdAt:desc)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const page = toInt(url.searchParams.get("page"), 1, 1, 1_000_000);
    const size = toInt(url.searchParams.get("size"), 20, 1, 100);
    const { field, dir } = normalizeSort(url.searchParams.get("sort"));
    const q = normalizeQ(url.searchParams.get("q"));

    // 타입 안전한 where 구성 (Prisma.QueryMode 사용)
    const insensitive: Prisma.QueryMode = "insensitive";
    const where: Prisma.UserWhereInput | undefined = q
      ? ({
          OR: [
            { username: { contains: q, mode: insensitive } },
            { email: { contains: q, mode: insensitive } },
            { name: { contains: q, mode: insensitive } },
            { referralCode: { contains: q, mode: insensitive } },
          ],
        } satisfies Prisma.UserWhereInput)
      : undefined;

    const [total, items] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { [field]: dir },
        skip: (page - 1) * size,
        take: size,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          referralCode: true,
          level: true,
          countryCode: true,
          googleOtpEnabled: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({ page, size, total, items });
  } catch (err) {
    console.error("[GET /api/admin/users] error:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
