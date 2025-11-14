// FILE: /src/app/api/admin/mining/policies/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  MiningPolicyUpdateBody,
  MiningPolicyUpdateResponse,
  MiningPolicyDeleteResponse,
  MiningPolicyListItem,
} from "@/types/admin/mining-policies";

function toListItem(r: {
  id: string;
  name: string;
  isActive: boolean;
  companyPct: unknown;
  selfPct: unknown;
  mlmPct: unknown;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
  companyUser?: { name: string | null } | null;
  mlmReferralPlan?: { name: string } | null;
  levelBonusPlan?: { name: string } | null;
}): MiningPolicyListItem {
  const decToStr = (d: unknown): string =>
    d == null ? "0" : (d as { toString: () => string }).toString();
  return {
    id: r.id,
    name: r.name,
    isActive: r.isActive,
    companyPct: decToStr(r.companyPct),
    selfPct: decToStr(r.selfPct),
    mlmPct: decToStr(r.mlmPct),
    companyUserName: r.companyUser?.name ?? undefined,
    mlmReferralPlanName: r.mlmReferralPlan?.name ?? undefined,
    levelBonusPlanName: r.levelBonusPlan?.name ?? undefined,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveTo: r.effectiveTo ? r.effectiveTo.toISOString() : undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  let body: MiningPolicyUpdateBody;
  try {
    body = (await req.json()) as MiningPolicyUpdateBody;
  } catch {
    const res: MiningPolicyUpdateResponse = {
      ok: false,
      error: "INVALID_JSON",
    };
    return NextResponse.json(res, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.companyPct === "string") data.companyPct = body.companyPct;
  if (typeof body.selfPct === "string") data.selfPct = body.selfPct;
  if (typeof body.mlmPct === "string") data.mlmPct = body.mlmPct;
  if (typeof body.companyUserId === "string")
    data.companyUserId = body.companyUserId;
  if (typeof body.mlmReferralPlanId === "string")
    data.mlmReferralPlanId = body.mlmReferralPlanId;
  if (typeof body.levelBonusPlanId === "string")
    data.levelBonusPlanId = body.levelBonusPlanId;
  if (typeof body.effectiveFrom === "string")
    data.effectiveFrom = new Date(body.effectiveFrom);
  if (typeof body.effectiveTo === "string")
    data.effectiveTo = new Date(body.effectiveTo);
  if (body.effectiveTo === null) data.effectiveTo = null;

  if (Object.keys(data).length === 0) {
    const res: MiningPolicyUpdateResponse = { ok: false, error: "NO_CHANGES" };
    return NextResponse.json(res, { status: 400 });
  }

  try {
    const updated = await prisma.miningPolicy.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        isActive: true,
        companyPct: true,
        selfPct: true,
        mlmPct: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdAt: true,
        updatedAt: true,
        companyUser: { select: { name: true } },
        mlmReferralPlan: { select: { name: true } },
        levelBonusPlan: { select: { name: true } },
      },
    });

    const res: MiningPolicyUpdateResponse = {
      ok: true,
      item: toListItem(updated),
    };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: MiningPolicyUpdateResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await prisma.miningPolicy.delete({ where: { id } });
    const res: MiningPolicyDeleteResponse = { ok: true, id };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: MiningPolicyDeleteResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}
