// FILE: /src/app/api/admin/level/policies/[id]/detail/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  LevelPolicyDetailResponse,
  LevelPolicyStructureInput,
  RequirementKind,
} from "@/types/admin/level-policies";

// GET /api/admin/level/policies/[id]/detail
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const row = await prisma.levelPolicy.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        levels: {
          orderBy: { level: "asc" },
          select: {
            level: true,
            groups: {
              orderBy: { ordinal: "asc" },
              select: {
                ordinal: true,
                requirements: {
                  // 정렬 필드가 필요하면 여기에 orderBy 추가
                  select: {
                    kind: true, // Prisma $Enums.LevelRequirementKind
                    amount: true, // Prisma Decimal | null
                    count: true, // number | null
                    targetLevel: true, // number | null
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!row) {
      const res: LevelPolicyDetailResponse = { ok: false, error: "NOT_FOUND" };
      return NextResponse.json(res, { status: 404 });
    }

    // Prisma Decimal -> string, Prisma enum -> our union으로 변환
    const structure: LevelPolicyStructureInput = {
      levels: row.levels.map((lv) => ({
        level: lv.level,
        groups: lv.groups.map((g) => ({
          ordinal: g.ordinal,
          requirements: g.requirements.map((r) => ({
            kind: r.kind as unknown as RequirementKind,
            amount: r.amount == null ? undefined : r.amount.toString(),
            count: r.count == null ? undefined : r.count,
            targetLevel: r.targetLevel == null ? undefined : r.targetLevel,
          })),
        })),
      })),
    };

    const res: LevelPolicyDetailResponse = {
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
    const res: LevelPolicyDetailResponse = { ok: false, error: msg };
    return NextResponse.json(res, { status: 500 });
  }
}
