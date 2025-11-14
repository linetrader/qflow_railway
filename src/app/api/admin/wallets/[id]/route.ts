// src/app/api/admin/wallets/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** 서버 실행 환경 및 타임박스 */
export const runtime = "nodejs";
export const maxDuration = 60; // seconds

// Next.js 15(또는 app router의 최신)에서 params가 Promise로 전달되는 케이스 안전 처리
type RouteContext = {
  params: Promise<{ id: string }>;
};

// 내부 DB 호출 타임아웃(상위 LB 60s/함수 60s 대비 여유있게 8s로 컷)
function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const t0 = Date.now();

  try {
    const { id } = await ctx.params; // 반드시 await
    const safeId = id?.trim();
    if (!safeId) {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }

    // 가벼운 프리플라이트 쿼리(연결 워밍업). 실패해도 본요청 진행.
    await prisma.$queryRaw`SELECT 1`.catch(() => {});

    const user = await withTimeout(
      prisma.user.findUnique({
        where: { id: safeId },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          level: true,
          countryCode: true,
          createdAt: true,
          wallet: {
            select: {
              id: true,
              depositAddress: true,
              withdrawAddress: true,
              balanceUSDT: true,
              balanceQAI: true,
              balanceDFT: true,
              depositKeyAlg: true,
              depositKeyVersion: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          _count: { select: { walletTxs: true } },
          walletTxs: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { id: true, createdAt: true },
          },
        },
      }),
      8_000
    );

    if (!user) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const t1 = Date.now();
    console.log("[GET /api/admin/wallets/[id]] timings(ms)", {
      total: t1 - t0,
    });

    return NextResponse.json({ item: user });
  } catch (e) {
    if ((e as Error)?.message === "TIMEOUT") {
      // 명시적 504 → 클라이언트는 재시도 로직을 통해 복구 가능
      return NextResponse.json({ error: "UPSTREAM_TIMEOUT" }, { status: 504 });
    }
    console.error("[GET /api/admin/wallets/[id]] error:", e);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
