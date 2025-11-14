// src/app/api/admin/mining/policies/level-bonus/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  LevelBonusPlanUpdateBody,
  LevelBonusPlanUpdateResponse,
  LevelBonusPlanDeleteResponse,
  LevelBonusPlanListItem,
} from "@/types/admin/level-policies/level-bonus-plans";

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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let body: LevelBonusPlanUpdateBody;
  try {
    body = (await req.json()) as LevelBonusPlanUpdateBody;
  } catch {
    const res: LevelBonusPlanUpdateResponse = {
      ok: false,
      error: "INVALID_JSON",
    };
    return NextResponse.json(res, { status: 400 });
  }

  const hasName = typeof body.name === "string";
  const hasActive = typeof body.isActive === "boolean";
  const hasStruct = Boolean(body.structure);

  if (!hasName && !hasActive && !hasStruct) {
    const res: LevelBonusPlanUpdateResponse = {
      ok: false,
      error: "NO_CHANGES",
    };
    return NextResponse.json(res, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (hasName || hasActive) {
        await tx.levelBonusPlan.update({
          where: { id },
          data: {
            ...(hasName ? { name: (body.name as string).trim() } : {}),
            ...(hasActive ? { isActive: body.isActive as boolean } : {}),
          },
          select: { id: true },
        });
      }
      if (hasStruct && body.structure) {
        await tx.levelBonusItem.deleteMany({ where: { planId: id } });
        if (body.structure.items.length > 0) {
          await tx.levelBonusPlan.update({
            where: { id },
            data: {
              items: {
                create: body.structure.items.map((it) => ({
                  level: it.level,
                  percent: it.percent,
                })),
              },
            },
            select: { id: true },
          });
        }
      }
      return tx.levelBonusPlan.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { items: true } },
        },
      });
    });

    const res: LevelBonusPlanUpdateResponse = {
      ok: true,
      item: toListItem(result),
    };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: LevelBonusPlanUpdateResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    await prisma.levelBonusPlan.delete({ where: { id } });
    const res: LevelBonusPlanDeleteResponse = { ok: true, id };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const res: LevelBonusPlanDeleteResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}
