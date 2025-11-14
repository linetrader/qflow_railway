// FILE: /src/app/api/admin/level/policies/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  LevelPolicyListItem,
  LevelPolicyListResponse,
  LevelPolicyCreateBody,
  LevelPolicyCreateResponse,
  LevelPolicyStructureInput,
  LevelInput,
  GroupInput,
  RequirementInput,
} from "@/types/admin/level-policies";

export const dynamic = "force-dynamic";

function toListItem(r: {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { levels: number };
}): LevelPolicyListItem {
  return {
    id: r.id,
    name: r.name,
    isActive: r.isActive,
    levelsCount: r._count.levels,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapStructure(struct?: LevelPolicyStructureInput) {
  if (!struct) return undefined;
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

export async function GET() {
  const rows = await prisma.levelPolicy.findMany({
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

  const items: LevelPolicyListItem[] = rows.map(toListItem);
  const body: LevelPolicyListResponse = { items };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(req: Request) {
  let body: LevelPolicyCreateBody;
  try {
    body = (await req.json()) as LevelPolicyCreateBody;
  } catch {
    const res: LevelPolicyCreateResponse = { ok: false, error: "INVALID_JSON" };
    return NextResponse.json(res, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string") {
    const res: LevelPolicyCreateResponse = {
      ok: false,
      error: "NAME_REQUIRED",
    };
    return NextResponse.json(res, { status: 400 });
  }
  const isActive = Boolean(body.isActive);

  try {
    const created = await prisma.levelPolicy.create({
      data: {
        name: body.name.trim(),
        isActive,
        ...(body.structure
          ? {
              levels: mapStructure(body.structure),
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
    const res: LevelPolicyCreateResponse = {
      ok: true,
      item: toListItem(created),
    };
    return NextResponse.json(res, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    const res: LevelPolicyCreateResponse = { ok: false, error: message };
    return NextResponse.json(res, { status: 500 });
  }
}
