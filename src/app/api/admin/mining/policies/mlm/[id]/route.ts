import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  MlmPlanUpdateBody,
  MlmPlanUpdateResponse,
  MlmPlanDeleteResponse,
  MlmPlanListItem,
} from "@/types/admin/level-policies/mlm-referral-plans";

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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let body: MlmPlanUpdateBody;
  try {
    body = (await req.json()) as MlmPlanUpdateBody;
  } catch {
    const res: MlmPlanUpdateResponse = { ok: false, error: "INVALID_JSON" };
    return NextResponse.json(res, { status: 400 });
  }

  const hasName = typeof body.name === "string";
  const hasActive = typeof body.isActive === "boolean";
  const hasStruct = Boolean(body.structure);

  if (!hasName && !hasActive && !hasStruct) {
    const res: MlmPlanUpdateResponse = { ok: false, error: "NO_CHANGES" };
    return NextResponse.json(res, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (hasName || hasActive) {
        await tx.mlmReferralPlan.update({
          where: { id },
          data: {
            ...(hasName ? { name: (body.name as string).trim() } : {}),
            ...(hasActive ? { isActive: body.isActive as boolean } : {}),
          },
          select: { id: true },
        });
      }

      if (hasStruct && body.structure) {
        // 구조 전체 치환: 기존 레벨 삭제 후 새로 생성
        await tx.mlmReferralPlanLevel.deleteMany({ where: { planId: id } });
        if (body.structure.levels.length > 0) {
          await tx.mlmReferralPlan.update({
            where: { id },
            data: {
              levels: {
                create: body.structure.levels.map((lv) => ({
                  level: lv.level,
                  percent: lv.percent,
                })),
              },
            },
            select: { id: true },
          });
        }
      }

      return tx.mlmReferralPlan.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { levels: true } },
        },
      });
    });

    const res: MlmPlanUpdateResponse = { ok: true, item: toListItem(result) };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: MlmPlanUpdateResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    await prisma.mlmReferralPlan.delete({ where: { id } });
    const res: MlmPlanDeleteResponse = { ok: true, id };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: MlmPlanDeleteResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}
