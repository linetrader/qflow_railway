// app/api/wallet/withdraw/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";
import { WalletTxStatus, WalletTxType, Prisma } from "@/generated/prisma";
import type { ErrBody, OkBody, TokenCode } from "@/types/wallet";

const TOKENS = new Set(["USDT", "QAI", "DFT"] as const);

type Decimalish = number | string | { toString(): string };

function toDecimal(x: Decimalish): Prisma.Decimal {
  return new Prisma.Decimal(x.toString());
}
function decSub(a: Decimalish, b: Decimalish): string {
  return toDecimal(a).sub(toDecimal(b)).toString();
}
function toNum(x: Decimalish): number {
  return Number(x.toString());
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      const body: ErrBody = { ok: false, code: "UNAUTHORIZED" };
      return NextResponse.json(body, { status: 401 });
    }

    const parsed = (await req.json().catch(() => null)) as {
      token?: unknown;
      amount?: unknown;
    } | null;
    const t = String(parsed?.token ?? "").toUpperCase() as TokenCode;

    if (!TOKENS.has(t)) {
      const body: ErrBody = {
        ok: false,
        code: "INVALID_TOKEN",
        message: "Unsupported token.",
      };
      return NextResponse.json(body, { status: 400 });
    }

    const n = Number(parsed?.amount);
    if (!Number.isFinite(n) || n <= 0) {
      const body: ErrBody = {
        ok: false,
        code: "INVALID_AMOUNT",
        message: "Invalid withdrawal amount.",
      };
      return NextResponse.json(body, { status: 400 });
    }

    const w = await prisma.userWallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: {
        userId: true,
        withdrawAddress: true,
        balanceUSDT: true,
        balanceQAI: true,
        balanceDFT: true,
      },
    });

    if (!w.withdrawAddress) {
      const body: ErrBody = {
        ok: false,
        code: "NO_WITHDRAW_ADDRESS",
        message: "Please register a withdrawal address first.",
      };
      return NextResponse.json(body, { status: 400 });
    }

    const current =
      t === "USDT"
        ? toNum(w.balanceUSDT)
        : t === "QAI"
        ? toNum(w.balanceQAI)
        : toNum(w.balanceDFT);

    if (n > current) {
      const body: ErrBody = {
        ok: false,
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient balance.",
      };
      return NextResponse.json(body, { status: 400 });
    }

    const [updatedWallet, tx] = await prisma.$transaction([
      prisma.userWallet.update({
        where: { userId },
        data:
          t === "USDT"
            ? { balanceUSDT: decSub(w.balanceUSDT, n) }
            : t === "QAI"
            ? { balanceQAI: decSub(w.balanceQAI, n) }
            : { balanceDFT: decSub(w.balanceDFT, n) },
        select: { balanceUSDT: true, balanceQAI: true, balanceDFT: true },
      }),
      prisma.walletTx.create({
        data: {
          userId,
          tokenCode: t,
          txType: WalletTxType.WITHDRAW,
          amount: new Prisma.Decimal(n).toString(),
          status: WalletTxStatus.PENDING,
          memo: "user requested withdraw",
          txHash: null,
          logIndex: null,
          blockNumber: null,
          fromAddress: null,
          toAddress: w.withdrawAddress,
        },
        select: {
          id: true,
          tokenCode: true,
          txType: true,
          amount: true, // Decimal
          status: true, // enum
          memo: true,
          txHash: true,
          logIndex: true,
          blockNumber: true, // bigint | null
          fromAddress: true,
          toAddress: true,
          createdAt: true, // Date
        },
      }),
    ]);

    // ← 직렬화 가능한 형태로 정규화
    const txOut: OkBody["tx"] = {
      id: tx.id,
      tokenCode: String(tx.tokenCode),
      txType: String(tx.txType),
      amount: tx.amount.toString(),
      status: String(tx.status),
      memo: tx.memo,
      txHash: tx.txHash,
      logIndex: tx.logIndex,
      blockNumber: tx.blockNumber === null ? null : String(tx.blockNumber),
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      createdAt: tx.createdAt.toISOString(),
    };

    const body: OkBody = {
      ok: true,
      tx: txOut,
      balances: {
        USDT: toNum(updatedWallet.balanceUSDT),
        QAI: toNum(updatedWallet.balanceQAI),
        DFT: toNum(updatedWallet.balanceDFT),
      },
    };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const body: ErrBody = {
      ok: false,
      code: "UNKNOWN",
      message: e instanceof Error ? e.message : String(e),
    };
    return NextResponse.json(body, { status: 500 });
  }
}
