import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  MlmPlanListItem,
  MlmPlanListResponse,
  MlmPlanCreateBody,
  MlmPlanCreateResponse,
} from "@/types/admin/level-policies/mlm-referral-plans";

export const dynamic = "force-dynamic";

function toListItem(r: {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { levels: number };
}): MlmPlanListItem {
  return {
    id: r.id,
    name: r.name,
    isActive: r.isActive,
    levelsCount: r._count.levels,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET() {
  const rows = await prisma.mlmReferralPlan.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { levels: true } },
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });
  const items: MlmPlanListItem[] = rows.map(toListItem);
  const body: MlmPlanListResponse = { items };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(req: Request) {
  let body: MlmPlanCreateBody;
  try {
    body = (await req.json()) as MlmPlanCreateBody;
  } catch {
    const res: MlmPlanCreateResponse = { ok: false, error: "INVALID_JSON" };
    return NextResponse.json(res, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string") {
    const res: MlmPlanCreateResponse = { ok: false, error: "NAME_REQUIRED" };
    return NextResponse.json(res, { status: 400 });
  }
  try {
    const created = await prisma.mlmReferralPlan.create({
      data: {
        name: body.name.trim(),
        isActive: Boolean(body.isActive),
        ...(body.structure
          ? {
              levels: {
                create: body.structure.levels.map((lv) => ({
                  level: lv.level,
                  percent: lv.percent, // Prisma Decimal <- string
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
        _count: { select: { levels: true } },
      },
    });
    const res: MlmPlanCreateResponse = { ok: true, item: toListItem(created) };
    return NextResponse.json(res, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: MlmPlanCreateResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}
