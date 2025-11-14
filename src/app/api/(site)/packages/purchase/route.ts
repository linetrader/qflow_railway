// src/app/api/(site)/packages/purchase/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";
import { Decimal } from "@prisma/client/runtime/library";
import { enqueueLevelRecalcJob } from "@/worker/level-recalc/jobs";
import type { Prisma } from "@/generated/prisma";
import type {
  LevelsByPackage,
  PurchaseItemInput,
  EdgeParentGroupPick,
} from "./modules/common";
import { payReferralCommissions } from "./modules/referral";
import { payCenterFees } from "./modules/center";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class CodedError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = "CodedError";
  }
}
function getCode(e: unknown): string | undefined {
  if (e instanceof CodedError) return e.code;
  if (typeof e === "object" && e !== null && "code" in e) {
    const v = (e as Record<string, unknown>).code;
    if (typeof v === "string") return v;
  }
  return undefined;
}

function errToString(e: unknown): string {
  try {
    if (e instanceof Error && "code" in e) {
      // PrismaKnownRequestError 등
      return `${(e as Error).name}: ${(e as Error).message}`;
    }
    if (e instanceof Error) return `${e.name}: ${e.message}`;
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, code: "UNAUTH" }, { status: 401 });
  }

  // 입력 파싱
  const body = await req.json().catch(() => ({} as unknown));
  const rawItems =
    typeof body === "object" &&
    body !== null &&
    "items" in (body as Record<string, unknown>) &&
    Array.isArray((body as Record<string, unknown>).items)
      ? ((body as Record<string, unknown>).items as unknown[])
      : [];

  const items: PurchaseItemInput[] = [];
  for (const it of rawItems) {
    const rec = it as Record<string, unknown>;
    const pidCandidate = rec?.packageId;
    const unitsCandidate = rec?.units;
    const pid = typeof pidCandidate === "string" ? pidCandidate.trim() : "";
    const u = typeof unitsCandidate === "number" ? unitsCandidate : Number.NaN;
    if (!pid || !Number.isInteger(u) || u <= 0) continue;
    items.push({ packageId: pid, units: u });
  }
  if (items.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_INPUT",
        message: "No valid purchase items were provided.",
      },
      { status: 400 }
    );
  }

  // 가격 조회
  const pkgIds = [...new Set(items.map((x) => x.packageId))];
  const pkgs = await prisma.package.findMany({
    where: { id: { in: pkgIds } },
    select: { id: true, price: true },
  });

  const priceMap = new Map<string, Decimal>();
  for (const p of pkgs) priceMap.set(p.id, new Decimal(p.price.toString()));
  const invalid = pkgIds.filter((id) => !priceMap.has(id));
  if (invalid.length) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNKNOWN_PACKAGE",
        message: `Unknown package id(s): ${invalid.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // 총액 계산
  let totalUSD = new Decimal(0);
  for (const { packageId, units } of items) {
    totalUSD = totalUSD.add(priceMap.get(packageId)!.mul(units));
  }
  if (totalUSD.lte(0)) {
    return NextResponse.json(
      { ok: false, code: "ZERO_TOTAL", message: "Total amount is zero." },
      { status: 400 }
    );
  }

  // 레벨 테이블
  const pkgPlanLevels = await prisma.packageReferralPlan.findMany({
    where: { packageId: { in: pkgIds } },
    select: {
      packageId: true,
      plan: {
        select: {
          levels: {
            select: { level: true, percent: true },
            orderBy: { level: "asc" },
          },
        },
      },
    },
  });
  const levelsByPackage: LevelsByPackage = new Map();
  for (const row of pkgPlanLevels) {
    const levels =
      row.plan?.levels?.map((lv) => ({
        level: lv.level,
        percent: new Decimal(lv.percent.toString()),
      })) ?? [];
    levelsByPackage.set(row.packageId, levels);
  }

  const now = new Date();

  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 0) 잠금 + 잔액 차감
        await tx.$queryRaw`SELECT id FROM "UserWallet" WHERE "userId" = ${userId} FOR UPDATE`;
        const wallet = await tx.userWallet.findUnique({
          where: { userId },
          select: { balanceUSDT: true },
        });
        if (!wallet) throw new CodedError("INSUFFICIENT_FUNDS");
        const currentBal = new Decimal(wallet.balanceUSDT.toString());
        if (currentBal.lt(totalUSD)) throw new CodedError("INSUFFICIENT_FUNDS");
        await tx.userWallet.update({
          where: { userId },
          data: { balanceUSDT: { decrement: totalUSD } },
        });

        // 1) UserPackage upsert
        for (const { packageId, units } of items) {
          await tx.userPackage.upsert({
            where: { userId_packageId: { userId, packageId } },
            create: { userId, packageId, quantity: units },
            update: { quantity: { increment: units } },
          });
        }

        // 2) History 생성
        const historyIds: string[] = [];
        const baseAmounts: Decimal[] = [];
        for (const { packageId, units } of items) {
          const unitPrice = priceMap.get(packageId)!;
          const totalPrice = unitPrice.mul(units);
          const h = await tx.userPackageHistory.create({
            data: {
              userId,
              packageId,
              quantity: units,
              unitPrice,
              totalPrice,
              createdAt: now,
            },
            select: { id: true },
          });
          historyIds.push(h.id);
          baseAmounts.push(totalPrice);
        }

        // 3) 레퍼럴 커미션
        await payReferralCommissions({
          tx,
          userId,
          items,
          historyIds,
          priceMap,
          levelsByPackage,
        });

        // 4) 단일 구매 시 QAI 적립
        if (items.length === 1) {
          const latestQai = await tx.coinPrice.findFirst({
            where: { tokenCode: "QAI" },
            orderBy: { createdAt: "desc" },
            select: { price: true },
          });
          if (latestQai) {
            const qaiPrice = new Decimal(latestQai.price.toString());
            if (qaiPrice.gt(0)) {
              const qaiAmount = totalUSD.div(qaiPrice);
              await tx.userWallet.upsert({
                where: { userId },
                create: { userId, balanceQAI: qaiAmount },
                update: { balanceQAI: { increment: qaiAmount } },
              });
              await tx.walletTx.create({
                data: {
                  userId,
                  tokenCode: "QAI",
                  txType: "DEPOSIT",
                  amount: qaiAmount,
                  status: "COMPLETED",
                  memo: `QAI allocation for package purchase (totalUSD=${totalUSD.toString()}, price=${qaiPrice.toString()})`,
                },
              });
            }
          }
        }

        // 5) 그룹 매출 누적
        {
          let currentChildId: string | null = userId;
          const MAX_DEPTH = 200;
          for (let step = 0; step < MAX_DEPTH; step++) {
            if (!currentChildId) break;
            const edge: EdgeParentGroupPick | null =
              await tx.referralEdge.findFirst({
                where: { childId: currentChildId },
                select: { parentId: true, groupNo: true },
              });
            const parentId: string | null = edge ? edge.parentId : null;
            const groupNo: number =
              edge && edge.groupNo !== null ? edge.groupNo : 0;
            if (!parentId) break;

            await tx.referralGroupSummary.upsert({
              where: { userId_groupNo: { userId: parentId, groupNo } },
              create: { userId: parentId, groupNo, salesVolume: totalUSD },
              update: { salesVolume: { increment: totalUSD } },
            });

            currentChildId = parentId;
          }
        }

        // 6) 센터피 지급
        await payCenterFees({
          tx,
          userId,
          historyIds,
          baseAmounts,
          now,
        });

        return {
          processed: items.length,
          historyIds,
          totalUSD: totalUSD.toString(),
        };
      }
    );

    // 7) 레벨 재산정 잡 — ★ 총액을 payload에 포함 (워커가 요구)
    try {
      await enqueueLevelRecalcJob({
        userId,
        // 스키마가 enum이면 정확히 매치되는 값으로 교체
        reason: "PURCHASE",
        payload: {
          historyIds: result.historyIds,
          purchaseAmountUSD: result.totalUSD, // 문자열
        },
      });
    } catch (ee: unknown) {
      console.error(
        "[packages/purchase] enqueueLevelRecalcJob error:",
        errToString(ee)
      );
      // enqueue 실패해도 구매 자체는 성공이므로 201은 유지(정책에 따라 조정)
    }

    return NextResponse.json(
      { ok: true, processed: result.processed, historyIds: result.historyIds },
      { status: 201 }
    );
  } catch (e: unknown) {
    const code = getCode(e);
    if (code === "INSUFFICIENT_FUNDS") {
      return NextResponse.json(
        {
          ok: false,
          code: "INSUFFICIENT_FUNDS",
          message:
            "Insufficient USDT balance. Please top up your balance or reduce the quantity.",
        },
        { status: 400 }
      );
    }
    if (code === "P2002") {
      return NextResponse.json(
        { ok: false, code: "CONFLICT", message: "Please try again shortly." },
        { status: 409 }
      );
    }

    // 500 상세 로그
    console.error("[packages/purchase] unexpected error:", errToString(e), e);
    return NextResponse.json(
      { ok: false, code: "UNKNOWN", message: "A server error occurred." },
      { status: 500 }
    );
  }
}
