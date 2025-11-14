// FILE: /src/app/api/admin/level/policies/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  LevelPolicyUpdateBody,
  LevelPolicyUpdateResponse,
  LevelPolicyDeleteResponse,
  LevelPolicyStructureInput,
  LevelInput,
  GroupInput,
  RequirementInput,
} from "@/types/admin/level-policies";

function mapStructure(struct: LevelPolicyStructureInput) {
  const levelsCreate = struct.levels.map((lv: LevelInput) => ({
    level: lv.level,
    groups: {
      create: lv.groups.map((g: GroupInput) => ({
        ordinal: g.ordinal,
        requirements: {
          create: g.requirements.map((req: RequirementInput) => ({
            kind: req.kind,
            amount: req.amount,
            count: req.count,
            targetLevel: req.targetLevel,
          })),
        },
      })),
    },
  }));
  return { create: levelsCreate };
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> } // ⬅️ params Promise
) {
  const { id } = await context.params; // ⬅️ await 필수

  let body: LevelPolicyUpdateBody;
  try {
    body = (await req.json()) as LevelPolicyUpdateBody;
  } catch {
    const res: LevelPolicyUpdateResponse = { ok: false, error: "INVALID_JSON" };
    return NextResponse.json(res, { status: 400 });
  }

  const namePatch =
    typeof body.name === "string" ? body.name.trim() : undefined;
  const isActivePatch =
    typeof body.isActive === "boolean" ? body.isActive : undefined;
  const hasStructure = Boolean(body.structure);

  if (namePatch === undefined && isActivePatch === undefined && !hasStructure) {
    const res: LevelPolicyUpdateResponse = { ok: false, error: "NO_CHANGES" };
    return NextResponse.json(res, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) 이름/활성 상태 1차 업데이트
      await tx.levelPolicy.update({
        where: { id },
        data: {
          ...(namePatch !== undefined ? { name: namePatch } : {}),
          ...(isActivePatch !== undefined ? { isActive: isActivePatch } : {}),
        },
        select: { id: true }, // 최소 select
      });

      // 2) 구조 치환: 기존 트리 삭제 -> 새 구조 생성
      if (hasStructure && body.structure) {
        await tx.levelPolicy.update({
          where: { id },
          data: {
            levels: { deleteMany: {} },
          },
          select: { id: true },
        });

        await tx.levelPolicy.update({
          where: { id },
          data: {
            levels: mapStructure(body.structure as LevelPolicyStructureInput),
          },
          select: { id: true },
        });
      }

      // 최종 조회(_count.levels 포함)
      const final = await tx.levelPolicy.findUniqueOrThrow({
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

      return final;
    });

    const res: LevelPolicyUpdateResponse = {
      ok: true,
      item: {
        id: result.id,
        name: result.name,
        isActive: result.isActive,
        levelsCount: result._count.levels,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
    };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    const res: LevelPolicyUpdateResponse = { ok: false, error: message };
    return NextResponse.json(res, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> } // ⬅️ params Promise
) {
  const { id } = await context.params; // ⬅️ await 필수
  try {
    await prisma.levelPolicy.delete({ where: { id } });
    const res: LevelPolicyDeleteResponse = { ok: true, id };
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    const res: LevelPolicyDeleteResponse = { ok: false, error: message };
    return NextResponse.json(res, { status: 500 });
  }
}
