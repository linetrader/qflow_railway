// /src/app/api/packages/route.ts
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

/** 패키지 이름의 첫 글자에서 kind 도출 (영문은 대문자화) */
function deriveKindFromName(name: string | null | undefined): string {
  const s = String(name ?? "").trim();
  if (!s) return "?";
  const ch = s.charAt(0);
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
}

function errMessage(e: unknown): string {
  return e instanceof Error
    ? e.message
    : typeof e === "string"
    ? e
    : "Server error";
}

/** keyset 커서 조건 (createdAt desc, id desc) */
function ltCursor(
  tsIso?: string | null,
  id?: string | null
): { OR?: Array<Record<string, unknown>> } {
  if (!tsIso || !id) return {};
  const ts = new Date(tsIso);
  if (Number.isNaN(ts.getTime())) return {};
  return {
    OR: [
      { createdAt: { lt: ts } },
      { AND: [{ createdAt: ts }, { id: { lt: id } }] },
    ],
  };
}

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, code: "UNAUTH" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") || 50))
    );
    const cursorTs = searchParams.get("cursorTs");
    const cursorId = searchParams.get("cursorId");

    // 내 지갑 USDT 잔액
    const walletP = prisma.userWallet.findUnique({
      where: { userId },
      select: { balanceUSDT: true },
    });

    // QAI 최신 시세
    const qaiP = prisma.coinPrice.findFirst({
      where: { tokenCode: "QAI" },
      orderBy: { createdAt: "desc" },
      select: { price: true },
    });

    // 패키지 목록
    const pkgsP = prisma.package.findMany({
      orderBy: { price: "asc" },
      select: { id: true, name: true, price: true, dailyDftAmount: true },
    });

    // 유저 레벨
    const userP = prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });

    // 패키지 히스토리 (커서 기반)
    const historyRowsP = prisma.userPackageHistory.findMany({
      where: { userId, ...ltCursor(cursorTs, cursorId) },
      include: { package: { select: { name: true, price: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1, // 다음 페이지 유무 판단을 위해 1개 더
    });

    const [wallet, latestQai, pkgs, user, historyRows] = await Promise.all([
      walletP,
      qaiP,
      pkgsP,
      userP,
      historyRowsP,
    ]);

    const qaiPrice: number | null = latestQai ? Number(latestQai.price) : null;

    const packages = pkgs.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      dailyDftAmount:
        p.dailyDftAmount !== null && p.dailyDftAmount !== undefined
          ? Number(p.dailyDftAmount)
          : undefined,
    }));

    const hasMore = historyRows.length > limit;
    const sliced = historyRows.slice(0, limit);

    const history = sliced.map((r) => {
      const kind = deriveKindFromName(r.package?.name);
      const unitPrice =
        r.unitPrice !== null && r.unitPrice !== undefined
          ? Number(r.unitPrice)
          : Number(r.package?.price ?? 0);

      return {
        id: r.id,
        kind, // "A"/"B"/...
        unitPrice,
        units: r.quantity,
        date: fmtDate(r.createdAt),
        status: "완료" as const,
      };
    });

    const last = sliced[sliced.length - 1];
    const nextCursor =
      hasMore && last
        ? { ts: last.createdAt.toISOString(), id: last.id }
        : null;

    return NextResponse.json(
      {
        ok: true,
        packages,
        userLevel: user?.level ?? null,
        history, // 현재 페이지 아이템
        nextCursor, // ← 추가
        usdtBalance:
          wallet?.balanceUSDT !== undefined && wallet?.balanceUSDT !== null
            ? Number(wallet.balanceUSDT)
            : 0,
        qaiPrice,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    console.error("[/api/packages] GET error", e);
    return NextResponse.json(
      { ok: false, message: errMessage(e) },
      { status: 500 }
    );
  }
}
