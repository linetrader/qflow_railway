// src/app/api/coin/prices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";
import type { PricesResponse, PricesErrCode, PricesOk } from "@/types/wallet";
import type { TokenSymbol } from "@/types/common";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: readonly TokenSymbol[] = ["USDT", "QAI", "DFT"] as const;

function toNum(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : fallback;
}

function parseTokens(param: string): TokenSymbol[] {
  const seen = new Set<string>();
  const out: TokenSymbol[] = [];
  for (const raw of param.split(",")) {
    const t = raw.trim().toUpperCase();
    if ((ALLOWED as readonly string[]).includes(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t as TokenSymbol);
    }
  }
  return out;
}

function defaultPriceOf(sym: TokenSymbol): number {
  return sym === "USDT" ? 1 : 0;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      const body = {
        ok: false as const,
        code: "UNAUTHORIZED" as PricesErrCode,
      };
      return NextResponse.json<PricesResponse>(body, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tokensParam = searchParams.get("tokens") ?? "";
    const reqTokens = parseTokens(tokensParam);

    if (reqTokens.length === 0) {
      const body = {
        ok: false as const,
        code: "BAD_REQUEST" as PricesErrCode,
        message: "tokens query required",
      };
      return NextResponse.json<PricesResponse>(body, { status: 400 });
    }

    // ⚠️ Prisma 스키마에 맞춰 key 조정:
    // - coinPrice 모델 컬럼이 'tokenCode' 라는 가정 (만약 'code' 또는 'symbol'이면 그 이름으로 바꾸세요)
    const rows = await prisma.coinPrice.findMany({
      where: { tokenCode: { in: reqTokens } },
      select: { tokenCode: true, price: true, withdrawFee: true },
    });

    const byCode = new Map<string, { price: unknown; withdrawFee: unknown }>();
    for (const r of rows) {
      byCode.set(String(r.tokenCode).toUpperCase(), {
        price: r.price,
        withdrawFee: r.withdrawFee,
      });
    }

    // ✅ 유니온 인덱싱 대신 PricesOk 사용
    const prices: PricesOk["prices"] = {};
    for (const t of reqTokens) {
      const hit = byCode.get(t);
      if (hit) {
        prices[t] = {
          price: toNum(hit.price, defaultPriceOf(t)),
          withdrawFee: toNum(hit.withdrawFee, 0),
        };
      } else {
        prices[t] = {
          price: defaultPriceOf(t),
          withdrawFee: 0,
        };
      }
    }

    const body = { ok: true as const, prices };
    return NextResponse.json<PricesResponse>(body, { status: 200 });
  } catch (e) {
    const body = {
      ok: false as const,
      code: "UNKNOWN" as PricesErrCode,
      message: e instanceof Error ? e.message : String(e),
    };
    return NextResponse.json<PricesResponse>(body, { status: 500 });
  }
}
