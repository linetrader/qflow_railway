// /src/app/api/team/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
}

// 안전한 Decimalish → number 변환
type Decimalish = number | string | { toString(): string } | null | undefined;
const toNum = (v: Decimalish) => {
  if (v == null) return 0;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : 0;
};

function errMessage(e: unknown): string {
  return e instanceof Error
    ? e.message
    : typeof e === "string"
    ? e
    : "Server error";
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, code: "UNAUTH" }, { status: 401 });
    }

    // 유저 레벨
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });

    // ReferralGroupSummary
    const groupSummaries = await prisma.referralGroupSummary.findMany({
      where: { userId },
      orderBy: { groupNo: "asc" },
      select: {
        groupNo: true,
        salesVolume: true,
        dailyAllowanceDFT: true,
        updatedAt: true,
      },
    });

    const referralGroups = groupSummaries.map((g) => ({
      groupNo: g.groupNo,
      salesVolume: toNum(g.salesVolume),
      dailyAllowanceDFT: toNum(g.dailyAllowanceDFT),
      updatedAt: fmtDate(g.updatedAt),
    }));

    return NextResponse.json(
      {
        ok: true,
        userLevel: user?.level ?? null,
        referralGroups,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    console.error("[/api/team/list] GET error", e);
    return NextResponse.json(
      { ok: false, message: errMessage(e) },
      { status: 500 }
    );
  }
}
