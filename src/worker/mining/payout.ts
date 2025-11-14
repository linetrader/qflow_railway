// src/worker/mining/payout.ts

import { prisma } from "@/lib/prisma";
import { MiningRewardKind, Prisma } from "@/generated/prisma";
import { Decimal } from "./types";

/** 날짜 롤오버 필요 여부(UTC) */
function needRoll(summaryDate: Date | null | undefined, now: Date) {
  if (!summaryDate) return true;
  const a = new Date(summaryDate);
  const b = new Date(now);
  return (
    a.getUTCFullYear() !== b.getUTCFullYear() ||
    a.getUTCMonth() !== b.getUTCMonth() ||
    a.getUTCDate() !== b.getUTCDate()
  );
}

/** (TX) UserRewardSummary 업데이트(일자 롤오버 포함) */
async function bumpRewardSummaryTx(
  tx: Prisma.TransactionClient,
  userId: string,
  delta: Decimal,
  now = new Date()
) {
  const summary = await tx.userRewardSummary.findUnique({ where: { userId } });
  if (!summary) {
    await tx.userRewardSummary.create({
      data: {
        userId,
        totalDFT: delta,
        todayDFT: delta,
        yesterdayDFT: new Decimal(0),
        calculatedAt: now,
      },
    });
    return;
  }

  if (needRoll(summary.calculatedAt, now)) {
    const yesterday = summary.todayDFT as unknown as Decimal;
    await tx.userRewardSummary.update({
      where: { userId },
      data: {
        totalDFT: (summary.totalDFT as unknown as Decimal).add(delta),
        todayDFT: delta,
        yesterdayDFT: yesterday,
        calculatedAt: now,
      },
    });
  } else {
    await tx.userRewardSummary.update({
      where: { userId },
      data: {
        totalDFT: (summary.totalDFT as unknown as Decimal).add(delta),
        todayDFT: (summary.todayDFT as unknown as Decimal).add(delta),
      },
    });
  }
}

/** 외부 호출용: 비TX 버전(호환성) */
export async function bumpRewardSummary(
  userId: string,
  delta: Decimal,
  now = new Date()
) {
  return prisma.$transaction((tx) =>
    bumpRewardSummaryTx(tx, userId, delta, now)
  );
}

/** (TX) UserRewardHistory 추가 */
async function addRewardHistoryTx(
  tx: Prisma.TransactionClient,
  args: {
    userId: string;
    kind: MiningRewardKind;
    amount: Decimal;
    refLevel?: number;
    awardLevel?: number;
    splitCount?: number;
    miningPayoutId?: string;
  }
) {
  const name =
    args.kind === MiningRewardKind.SELF
      ? "[DFT] SELF"
      : args.kind === MiningRewardKind.COMPANY
      ? "[DFT] COMPANY"
      : args.kind === MiningRewardKind.MLM_REF
      ? "[DFT] REFERRER"
      : "[DFT] LEVEL";

  const noteParts: string[] = [];
  if (args.refLevel != null) noteParts.push(`refLevel=${args.refLevel}`);
  if (args.awardLevel != null) noteParts.push(`awardLevel=${args.awardLevel}`);
  if (args.splitCount != null) noteParts.push(`split=${args.splitCount}`);
  const note = noteParts.length ? noteParts.join(",") : null;

  await tx.userRewardHistory.create({
    data: {
      userId: args.userId,
      name,
      amountDFT: args.amount,
      note,
      miningPayoutId: args.miningPayoutId ?? null,
    },
  });
}

/** 외부 호출용: 비TX 버전(호환성) */
export async function addRewardHistory(args: {
  userId: string;
  kind: MiningRewardKind;
  amount: Decimal;
  refLevel?: number;
  awardLevel?: number;
  splitCount?: number;
  miningPayoutId?: string;
}) {
  return prisma.$transaction((tx) => addRewardHistoryTx(tx, args));
}

/** UserReferralStats: baseDailyDft를 소스 유저에 1회 반영 */
export async function bumpReferralStatsForSource(
  sourceUserId: string,
  baseDailyDft: Decimal
) {
  return prisma.$transaction(async (tx) => {
    const stats = await tx.userReferralStats.findUnique({
      where: { userId: sourceUserId },
    });
    if (!stats) {
      await tx.userReferralStats.create({
        data: {
          userId: sourceUserId,
          totalSalesVolume: new Decimal(0),
          totalDailyAllowanceDFT: baseDailyDft,
        },
      });
    } else {
      await tx.userReferralStats.update({
        where: { userId: sourceUserId },
        data: {
          totalDailyAllowanceDFT: (
            stats.totalDailyAllowanceDFT as unknown as Decimal
          ).add(baseDailyDft),
        },
      });
    }
  });
}

/** MiningPayout 생성 + 요약/이력 갱신 (원자적) */
export async function createPayout(args: {
  runId: string;
  sourceUserId: string;
  beneficiaryUserId: string;
  kind: MiningRewardKind;
  amountDFT: Decimal;
  baseDailyDft?: Decimal;
  userNodeQuantity?: number;
  refLevel?: number;
  awardLevel?: number;
  splitCount?: number;
}) {
  await prisma.$transaction(async (tx) => {
    const payout = await tx.miningPayout.create({
      data: {
        runId: args.runId,
        sourceUserId: args.sourceUserId,
        beneficiaryUserId: args.beneficiaryUserId,
        kind: args.kind,
        amountDFT: args.amountDFT,
        baseDailyDft: args.baseDailyDft,
        userNodeQuantity: args.userNodeQuantity,
        refLevel: args.refLevel,
        awardLevel: args.awardLevel,
        splitCount: args.splitCount,
      },
      select: { id: true },
    });

    await bumpRewardSummaryTx(tx, args.beneficiaryUserId, args.amountDFT);

    await addRewardHistoryTx(tx, {
      userId: args.beneficiaryUserId,
      kind: args.kind,
      amount: args.amountDFT,
      refLevel: args.refLevel,
      awardLevel: args.awardLevel,
      splitCount: args.splitCount,
      miningPayoutId: payout.id,
    });
  });
}
