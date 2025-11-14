// src/app/api/admin/mining/policies/level-bonus/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  LevelBonusPlanListItem,
  LevelBonusPlanListResponse,
  LevelBonusPlanCreateBody,
  LevelBonusPlanCreateResponse,
} from "@/types/admin/level-policies/level-bonus-plans";

export const dynamic = "force-dynamic";

function toListItem(r: {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { items: number };
}): LevelBonusPlanListItem {
  return {
    id: r.id,
    name: r.name,
    isActive: r.isActive,
    itemsCount: r._count.items,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET() {
  const rows = await prisma.levelBonusPlan.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });
  const items: LevelBonusPlanListItem[] = rows.map(toListItem);
  const body: LevelBonusPlanListResponse = { items };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(req: Request) {
  let body: LevelBonusPlanCreateBody;
  try {
    body = (await req.json()) as LevelBonusPlanCreateBody;
  } catch {
    const res: LevelBonusPlanCreateResponse = {
      ok: false,
      error: "INVALID_JSON",
    };
    return NextResponse.json(res, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string") {
    const res: LevelBonusPlanCreateResponse = {
      ok: false,
      error: "NAME_REQUIRED",
    };
    return NextResponse.json(res, { status: 400 });
  }
  try {
    const created = await prisma.levelBonusPlan.create({
      data: {
        name: body.name.trim(),
        isActive: Boolean(body.isActive),
        ...(body.structure
          ? {
              items: {
                create: body.structure.items.map((it) => ({
                  level: it.level,
                  percent: it.percent,
                })),
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
    });
    const res: LevelBonusPlanCreateResponse = {
      ok: true,
      item: toListItem(created),
    };
    return NextResponse.json(res, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: LevelBonusPlanCreateResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}
