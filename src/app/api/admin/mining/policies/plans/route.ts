// FILE: /src/app/api/admin/mining/policies/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  MiningPolicyListItem,
  MiningPolicyListResponse,
  MiningPolicyCreateBody,
  MiningPolicyCreateResponse,
} from "@/types/admin/mining-policies";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const rows = await prisma.miningPolicy.findMany({
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
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  const items: MiningPolicyListItem[] = rows.map(toListItem);
  const body: MiningPolicyListResponse = { items };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(req: Request) {
  let body: MiningPolicyCreateBody;
  try {
    body = (await req.json()) as MiningPolicyCreateBody;
  } catch {
    const res: MiningPolicyCreateResponse = {
      ok: false,
      error: "INVALID_JSON",
    };
    return NextResponse.json(res, { status: 400 });
  }

  // 최소 검증
  const required: Array<keyof MiningPolicyCreateBody> = [
    "name",
    "companyPct",
    "selfPct",
    "mlmPct",
    "companyUserId",
    "mlmReferralPlanId",
    "levelBonusPlanId",
    "effectiveFrom",
  ];
  for (const k of required) {
    if ((body as Record<string, unknown>)[k] == null) {
      const res: MiningPolicyCreateResponse = {
        ok: false,
        error: `MISSING_${k}`,
      };
      return NextResponse.json(res, { status: 400 });
    }
  }

  try {
    const created = await prisma.miningPolicy.create({
      data: {
        name: body.name.trim(),
        isActive: Boolean(body.isActive),
        companyPct: body.companyPct,
        selfPct: body.selfPct,
        mlmPct: body.mlmPct,
        companyUserId: body.companyUserId,
        mlmReferralPlanId: body.mlmReferralPlanId,
        levelBonusPlanId: body.levelBonusPlanId,
        effectiveFrom: new Date(body.effectiveFrom),
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
      },
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

    const res: MiningPolicyCreateResponse = {
      ok: true,
      item: toListItem(created),
    };
    return NextResponse.json(res, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: MiningPolicyCreateResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}
