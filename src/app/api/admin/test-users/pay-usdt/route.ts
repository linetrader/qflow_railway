// app/api/admin/test-users/pay-usdt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, WalletTxType, WalletTxStatus } from "@/generated/prisma";

export const runtime = "nodejs";

type ItemResult =
  | { username: string; status: "UPDATED"; amount: string }
  | { username: string; status: "DRY"; amount: string }
  | { username: string; status: "SKIPPED_RANGE" }
  | { username: string; status: "ERROR"; message: string };

type Resp =
  | {
      ok: true;
      summary: { targets: number; success: number; fail: number; dry: number };
      items: ItemResult[];
    }
  | { ok: false; error: string };

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg } as Resp, { status });
}

function isPositiveDecimal(v: unknown): v is string | number {
  const s = String(v ?? "");
  if (!s || s === "0") return false;
  const n = Number(s);
  if (!Number.isFinite(n)) return false;
  return n > 0;
}

function inRangeBySuffix(
  username: string,
  prefix: string,
  pad: number,
  start?: number,
  end?: number
): boolean {
  if (start === undefined && end === undefined) return true;
  if (!username.startsWith(prefix)) return false;
  const tail = username.slice(prefix.length);
  if (!/^\d+$/.test(tail)) return false;
  const n = Number(tail);
  if (!Number.isInteger(n)) return false;
  if (start !== undefined && n < start) return false;
  if (end !== undefined && n > end) return false;
  // if (tail.length !== pad) return false; // 필요 시 패드 길이 엄격 검증
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;

    // 타입 가드/정규화
    if (typeof body !== "object" || body === null) {
      return bad("Invalid body");
    }
    const o = body as Record<string, unknown>;
    if (!isPositiveDecimal(o.amount)) {
      return bad("amount must be a positive number");
    }
    const amount = new Prisma.Decimal(String(o.amount));

    const prefix =
      typeof o.prefix === "string" && o.prefix.trim()
        ? o.prefix.trim()
        : "test";
    const pad = Number(o.pad ?? 3);
    const start = o.start === undefined ? undefined : Number(o.start);
    const end = o.end === undefined ? undefined : Number(o.end);
    const dry = !!o.dry;

    if (!Number.isInteger(pad) || pad < 0) return bad("pad must be >= 0");
    if (start !== undefined && (!Number.isInteger(start) || start <= 0))
      return bad("start must be an integer >= 1");
    if (end !== undefined && (!Number.isInteger(end) || end <= 0))
      return bad("end must be an integer >= 1");
    if (start !== undefined && end !== undefined && start > end)
      return bad("start cannot be greater than end");

    // 대상 조회 (username 접두사)
    const users = await prisma.user.findMany({
      where: { username: { startsWith: prefix } },
      select: { id: true, username: true },
      orderBy: { username: "asc" },
    });

    if (!users.length) {
      return NextResponse.json({
        ok: true,
        summary: { targets: 0, success: 0, fail: 0, dry: 0 },
        items: [],
      } as Resp);
    }

    const items: ItemResult[] = [];
    let success = 0;
    let fail = 0;
    let dryCnt = 0;

    for (const u of users) {
      // 범위 필터
      if (!inRangeBySuffix(u.username, prefix, pad, start, end)) {
        items.push({ username: u.username, status: "SKIPPED_RANGE" });
        continue;
      }

      if (dry) {
        items.push({
          username: u.username,
          status: "DRY",
          amount: amount.toString(),
        });
        dryCnt++;
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          // 1) 행 잠금 (지갑)
          await tx.$queryRaw`SELECT id FROM "UserWallet" WHERE "userId" = ${u.id} FOR UPDATE`;

          // 2) 지갑 upsert & 잔액 증가
          await tx.userWallet.upsert({
            where: { userId: u.id },
            create: {
              userId: u.id,
              balanceUSDT: amount,
            },
            update: {
              balanceUSDT: { increment: amount },
            },
          });

          // 3) 트랜잭션 기록 (새 스키마에 맞춰 address 제거, 체인 필드 null)
          await tx.walletTx.create({
            data: {
              userId: u.id,
              tokenCode: "USDT", // Token.code FK
              txType: WalletTxType.DEPOSIT,
              amount, // Decimal
              status: WalletTxStatus.COMPLETED,
              memo: "bulk USDT airdrop (admin/pay-usdt)",

              // 체인 정보 없음 → null
              txHash: null,
              logIndex: null,
              blockNumber: null,
              fromAddress: null,
              toAddress: null,
            },
          });
        });

        items.push({
          username: u.username,
          status: "UPDATED",
          amount: amount.toString(),
        });
        success++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        items.push({ username: u.username, status: "ERROR", message: msg });
        fail++;
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        targets: items.filter((i) => i.status !== "SKIPPED_RANGE").length,
        success,
        fail,
        dry: dryCnt,
      },
      items,
    } as Resp);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "INTERNAL_ERROR";
    return NextResponse.json({ ok: false, error: message } as Resp, {
      status: 500,
    });
  }
}
