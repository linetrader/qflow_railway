// app/api/wallet/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 안전한 Decimalish → number 변환 (NaN 방지)
type Decimalish = number | string | { toString(): string } | null | undefined;
const toNum = (v: Decimalish): number => {
  if (v == null) return 0;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : 0;
};

type Token = "USDT" | "QAI" | "DFT";

interface WalletOk {
  wallet: {
    depositAddress: string | null;
    withdrawAddress: string | null;
  };
  balances: Partial<Record<Token, number>>;
}
type WalletErr = {
  ok: false;
  code: "UNAUTHORIZED" | "UNKNOWN";
  message?: string;
};

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      const body: WalletErr = { ok: false, code: "UNAUTHORIZED" };
      return NextResponse.json(body, { status: 401 });
    }

    // 없으면 생성(초기 잔고 0) + 리워드 요약 동시 조회
    const [wallet, rewardSummary] = await prisma.$transaction([
      prisma.userWallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: {
          depositAddress: true,
          withdrawAddress: true,
          balanceUSDT: true,
          balanceQAI: true,
          balanceDFT: true,
        },
      }),
      prisma.userRewardSummary.findUnique({
        where: { userId },
        select: { totalDFT: true },
      }),
    ]);

    const body: { ok: true } & WalletOk = {
      ok: true,
      wallet: {
        depositAddress: wallet.depositAddress,
        withdrawAddress: wallet.withdrawAddress,
      },
      balances: {
        USDT: toNum(wallet.balanceUSDT),
        QAI: toNum(wallet.balanceQAI),
        // DFT는 누적 리워드 합계를 우선 사용(폴백: wallet.balanceDFT)
        DFT: rewardSummary
          ? toNum(rewardSummary.totalDFT)
          : toNum(wallet.balanceDFT),
      },
    };

    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const body: WalletErr = {
      ok: false,
      code: "UNKNOWN",
      message: e instanceof Error ? e.message : String(e),
    };
    return NextResponse.json(body, { status: 500 });
  }
}
