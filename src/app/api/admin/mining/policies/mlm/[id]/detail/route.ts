import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  MlmPlanDetailResponse,
  MlmPlanStructureInput,
} from "@/types/admin/level-policies/mlm-referral-plans";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    const row = await prisma.mlmReferralPlan.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        levels: {
          orderBy: { level: "asc" },
          select: { level: true, percent: true },
        },
      },
    });
    if (!row) {
      const res: MlmPlanDetailResponse = { ok: false, error: "NOT_FOUND" };
      return NextResponse.json(res, { status: 404 });
    }
    const structure: MlmPlanStructureInput = {
      levels: row.levels.map((lv) => ({
        level: lv.level,
        percent: (
          lv.percent as unknown as { toString: () => string }
        ).toString(),
      })),
    };
    const res: MlmPlanDetailResponse = {
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
    const res: MlmPlanDetailResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}
