// src/app/api/admin/packages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { Decimal } from "@/generated/prisma/runtime/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function toInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const i = Math.trunc(n);
  if (i < min) return def;
  if (i > max) return max;
  return i;
}

const SORT_WHITELIST = new Set([
  "createdAt:desc",
  "createdAt:asc",
  "name:asc",
  "name:desc",
  "price:asc",
  "price:desc",
]);

function normalizeSort(raw: string | null): {
  field: keyof Prisma.PackageOrderByWithRelationInput;
  dir: "asc" | "desc";
} {
  const v = raw && SORT_WHITELIST.has(raw) ? raw : "createdAt:desc";
  const [field, dir] = v.split(":") as [
    keyof Prisma.PackageOrderByWithRelationInput,
    "asc" | "desc"
  ];
  return { field, dir };
}

/** 목록 조회 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = toInt(url.searchParams.get("page"), 1, 1, 10_000);
    const size = toInt(url.searchParams.get("size"), 20, 1, 100);
    const q = url.searchParams.get("q")?.trim();
    const { field, dir } = normalizeSort(url.searchParams.get("sort"));

    const where: Prisma.PackageWhereInput | undefined = q
      ? { name: { contains: q, mode: "insensitive" } }
      : undefined;

    const [total, items] = await prisma.$transaction([
      prisma.package.count({ where }),
      prisma.package.findMany({
        where,
        orderBy: { [field]: dir },
        skip: (page - 1) * size,
        take: size,
        select: {
          id: true,
          name: true,
          price: true,
          dailyDftAmount: true,
        },
      }),
    ]);

    return NextResponse.json({ page, size, total, items });
  } catch (e) {
    console.error("[GET /api/admin/packages] error:", e);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/** 신규 등록 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      price?: string;
      dailyDftAmount?: string;
    };

    if (!body.name || !body.price || !body.dailyDftAmount) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    const created = await prisma.package.create({
      data: {
        name: body.name.trim(),
        price: new Decimal(body.price),
        dailyDftAmount: new Decimal(body.dailyDftAmount),
      },
      select: { id: true, name: true, price: true, dailyDftAmount: true },
    });

    return NextResponse.json({ item: created });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      // unique constraint failed on the fields: (`name`)
      return NextResponse.json({ error: "DUPLICATE_NAME" }, { status: 409 });
    }
    console.error("[POST /api/admin/packages] error:", e);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
