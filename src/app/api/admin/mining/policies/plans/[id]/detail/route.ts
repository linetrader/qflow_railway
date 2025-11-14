import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  MiningPolicyDetailResponse,
  MiningPolicyDetailItem,
} from "@/types/admin/mining-policies";

function decToStr(d: unknown): string {
  return d == null ? "0" : (d as { toString: () => string }).toString();
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const row = await prisma.miningPolicy.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isActive: true,
        companyPct: true,
        selfPct: true,
        mlmPct: true,
        // ⬇️ 편집에 필요한 실제 ID들을 select
        companyUserId: true,
        mlmReferralPlanId: true,
        levelBonusPlanId: true,

        effectiveFrom: true,
        effectiveTo: true,
        createdAt: true,
        updatedAt: true,
        companyUser: { select: { name: true } },
        mlmReferralPlan: { select: { name: true } },
        levelBonusPlan: { select: { name: true } },
      },
    });

    if (!row) {
      const res: MiningPolicyDetailResponse = { ok: false, error: "NOT_FOUND" };
      return NextResponse.json(res, { status: 404 });
    }

    const item: MiningPolicyDetailItem = {
      id: row.id,
      name: row.name,
      isActive: row.isActive,
      companyPct: decToStr(row.companyPct),
      selfPct: decToStr(row.selfPct),
      mlmPct: decToStr(row.mlmPct),

      // ⬇️ 실제 ID 반환
      companyUserId: row.companyUserId,
      mlmReferralPlanId: row.mlmReferralPlanId,
      levelBonusPlanId: row.levelBonusPlanId,

      companyUserName: row.companyUser?.name ?? undefined,
      mlmReferralPlanName: row.mlmReferralPlan?.name ?? undefined,
      levelBonusPlanName: row.levelBonusPlan?.name ?? undefined,

      effectiveFrom: row.effectiveFrom.toISOString(),
      effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString() : undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };

    const res: MiningPolicyDetailResponse = { ok: true, item };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: MiningPolicyDetailResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}
