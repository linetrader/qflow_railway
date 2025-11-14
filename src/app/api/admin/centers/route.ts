// src/app/api/admin/centers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  rebuildLinksForCenterTx,
  removeLinksForCenterTx,
} from "@/lib/centers/linking";

const MIN_CENTER_LEVEL = 5;

interface CreateCenterBody {
  userId: string;
  percent: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
}
interface DeleteCenterBody {
  userId: string;
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// ✅ 수정: q 유무로 검색/목록 분기
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  // 검색 모드: username 부분검색 + isCenterManager 플래그
  if (q && q.trim() !== "") {
    const term = q.trim();
    const users = await prisma.user.findMany({
      where: { username: { contains: term, mode: "insensitive" } },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        managedCenter: { select: { id: true } }, // 센터장 여부 확인
      },
      take: 20,
      orderBy: { username: "asc" },
    });

    const data = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      isCenterManager: Boolean(u.managedCenter),
    }));

    return NextResponse.json({ ok: true, data });
  }

  // 목록 모드: CenterManager + user 포함 (프론트 타입 CenterManagerItem에 맞춤)
  const managers = await prisma.centerManager.findMany({
    orderBy: [
      { isActive: "desc" },
      { effectiveTo: "asc" },
      { createdAt: "desc" },
    ],
    include: {
      user: { select: { id: true, username: true, name: true, email: true } },
    },
  });

  const data = managers.map((m) => ({
    id: m.id,
    user: {
      id: m.user.id,
      username: m.user.username,
      name: m.user.name,
      email: m.user.email,
    },
    percent: m.percent.toString(),
    isActive: m.isActive,
    effectiveFrom: m.effectiveFrom.toISOString(),
    effectiveTo: m.effectiveTo ? m.effectiveTo.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  }));

  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateCenterBody;
  if (!body.userId) return bad("MISSING_USER_ID");
  if (Number.isNaN(body.percent) || body.percent <= 0 || body.percent > 100)
    return bad("INVALID_PERCENT");

  const effectiveFrom = body.effectiveFrom
    ? new Date(body.effectiveFrom)
    : new Date();
  const effectiveTo = body.effectiveTo ? new Date(body.effectiveTo) : null;
  const isActive = body.isActive ?? true;

  try {
    const manager = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: body.userId },
        select: { id: true, level: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.level < MIN_CENTER_LEVEL) {
        throw new Error(`LEVEL_TOO_LOW(>=${MIN_CENTER_LEVEL})`);
      }

      const cm = await tx.centerManager.upsert({
        where: { userId: body.userId },
        create: {
          userId: body.userId,
          percent: new Prisma.Decimal(body.percent),
          isActive,
          effectiveFrom,
          effectiveTo,
        },
        update: {
          percent: new Prisma.Decimal(body.percent),
          isActive,
          effectiveFrom,
          effectiveTo,
        },
      });

      await removeLinksForCenterTx(tx, cm.userId);
      const { createdCount } = await rebuildLinksForCenterTx(tx, cm.userId);

      return { cm, createdCount };
    });

    return NextResponse.json({ ok: true, data: manager });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return bad(msg);
  }
}

export async function DELETE(req: NextRequest) {
  const body = (await req.json()) as DeleteCenterBody;
  if (!body.userId) return bad("MISSING_USER_ID");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.centerManager.findUnique({
        where: { userId: body.userId },
      });
      if (!existing) throw new Error("CENTER_NOT_FOUND");

      const cm = await tx.centerManager.update({
        where: { userId: body.userId },
        data: { isActive: false, effectiveTo: new Date() },
      });

      const removedCount = await removeLinksForCenterTx(tx, body.userId);

      return { cm, removedCount };
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return bad(msg);
  }
}
