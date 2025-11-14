// src/app/api/wallet/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function errMessage(e: unknown): string {
  return e instanceof Error
    ? e.message
    : typeof e === "string"
    ? e
    : "Server error";
}

// keyset 커서 (createdAt desc, id desc)
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

type Token = "USDT" | "QAI" | "DFT";
type ApiTx = {
  id: string;
  type: "DEPOSIT" | "WITHDRAW";
  token: Token;
  amount: number;
  date: string; // "YYYY-MM-DD HH:mm"
  status: "COMPLETED" | "PENDING" | "FAILED";
};

type SuccessPayload = {
  ok: true;
  items: ApiTx[];
  nextCursor: { ts?: string | null; id?: string | null } | null;
};
type ErrorPayload = {
  ok: false;
  code: "UNAUTHORIZED" | "UNKNOWN";
  message?: string;
};

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      const body: ErrorPayload = { ok: false, code: "UNAUTHORIZED" };
      return NextResponse.json(body, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") || 50))
    );
    const cursorTs = searchParams.get("cursorTs");
    const cursorId = searchParams.get("cursorId");

    const rows = await prisma.walletTx.findMany({
      where: { userId, ...ltCursor(cursorTs, cursorId) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        txType: true, // "DEPOSIT" | "WITHDRAW"
        tokenCode: true, // "USDT" | "QAI" | "DFT"
        amount: true,
        status: true, // "PENDING" | "COMPLETED" | "REJECTED"
        createdAt: true,
      },
    });

    const hasMore = rows.length > limit;
    const sliced = rows.slice(0, limit);

    const items: ApiTx[] = sliced.map((r) => ({
      id: r.id,
      type: r.txType as "DEPOSIT" | "WITHDRAW",
      token: r.tokenCode as Token,
      amount: Number(r.amount),
      date: fmtDate(r.createdAt),
      status:
        r.status === "COMPLETED"
          ? "COMPLETED"
          : r.status === "PENDING"
          ? "PENDING"
          : "FAILED", // REJECTED → FAILED 매핑
    }));

    const last = sliced[sliced.length - 1];
    const nextCursor =
      hasMore && last
        ? { ts: last.createdAt.toISOString(), id: last.id }
        : null;

    const body: SuccessPayload = { ok: true, items, nextCursor };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const body: ErrorPayload = {
      ok: false,
      code: "UNKNOWN",
      message: errMessage(e),
    };
    return NextResponse.json(body, { status: 500 });
  }
}
