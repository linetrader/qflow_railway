// src/app/api/(site)/home/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";
import type { ApiHomeResult, ApiHomeSuccess } from "@/types/home";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Decimal/number/string 등을 number로 안전 변환 (NaN 방지) */
type Decimalish = number | string | { toString(): string } | null | undefined;
const toNum = (d: Decimalish): number => {
  if (d == null) return 0;
  const n = Number(String(d));
  return Number.isFinite(n) ? n : 0;
};

const errMessage = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === "string" ? e : "Internal error";

/**
 * GET /api/home
 * - 지갑 잔액 upsert(없으면 생성)
 * - 최근 보상/패키지 이력 조회
 * - DFT는 UserRewardSummary.totalDFT를 우선 사용(없으면 wallet.balanceDFT 폴백)
 * - 응답은 ApiHomeResult (ok: true/false)
 */
export async function GET(): Promise<NextResponse<ApiHomeResult>> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, code: "UNAUTH" }, { status: 401 });
    }

    // 단일 트랜잭션으로 병렬 읽기(일관성/커넥션 효율)
    const [wallet, rewards, packages, rewardSummary] =
      await prisma.$transaction([
        prisma.userWallet.upsert({
          where: { userId },
          create: { userId },
          update: {},
          select: {
            balanceUSDT: true,
            balanceQAI: true,
            balanceDFT: true,
          },
        }),
        prisma.userRewardHistory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            name: true,
            amountDFT: true,
            note: true,
            createdAt: true,
          },
        }),
        prisma.userPackageHistory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            packageId: true,
            quantity: true,
            createdAt: true,
            package: { select: { name: true, price: true } },
          },
        }),
        prisma.userRewardSummary.findUnique({
          where: { userId },
          select: { totalDFT: true },
        }),
      ]);

    const balances = {
      usdt: toNum(wallet.balanceUSDT),
      qai: toNum(wallet.balanceQAI),
      // DFT는 누적 리워드 합계를 우선 사용, 없으면 wallet 값을 폴백
      dft: rewardSummary
        ? toNum(rewardSummary.totalDFT)
        : toNum(wallet.balanceDFT),
    };

    const rewardHistory = rewards.map((r) => ({
      id: r.id,
      name: r.name,
      amountDFT: toNum(r.amountDFT),
      note: r.note ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    const packageHistory = packages.map((p) => {
      const unitPrice = toNum(p.package?.price);
      const totalPrice = unitPrice * p.quantity;
      return {
        id: p.id,
        packageId: p.packageId,
        packageName: p.package?.name ?? null,
        quantity: p.quantity,
        unitPrice,
        totalPrice,
        createdAt: p.createdAt.toISOString(),
      };
    });

    const payload: ApiHomeSuccess = {
      ok: true,
      authed: true,
      balances,
      rewardHistory,
      packageHistory,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: errMessage(err) },
      { status: 500 }
    );
  }
}
