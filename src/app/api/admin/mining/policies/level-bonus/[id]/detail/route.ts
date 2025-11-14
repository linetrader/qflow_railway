// src/app/api/admin/mining/policies/level-bonus/[id]/detail/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  LevelBonusPlanDetailResponse,
  LevelBonusPlanStructureInput,
} from "@/types/admin/level-policies/level-bonus-plans";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    const row = await prisma.levelBonusPlan.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        items: {
          orderBy: { level: "asc" },
          select: { level: true, percent: true },
        },
      },
    });
    if (!row) {
      const res: LevelBonusPlanDetailResponse = {
        ok: false,
        error: "NOT_FOUND",
      };
      return NextResponse.json(res, { status: 404 });
    }
    const structure: LevelBonusPlanStructureInput = {
      items: row.items.map((it) => ({
        level: it.level,
        percent: (
          it.percent as unknown as { toString: () => string }
        ).toString(),
      })),
    };
    const res: LevelBonusPlanDetailResponse = {
      ok: true,
      item: {
        id: row.id,
        name: row.name,
        isActive: row.isActive,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        structure,
      },
    };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: LevelBonusPlanDetailResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}
