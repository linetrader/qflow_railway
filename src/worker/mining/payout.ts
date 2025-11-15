// src/worker/mining/payout.ts
import { prisma } from "@/lib/prisma";
import { MiningRewardKind, Prisma } from "@/generated/prisma";
import { Decimal } from "./types";

/**
 * UserRewardSummary 날짜 롤오버 필요 여부(UTC 기준)
 * - summaryDate: 기존 calculatedAt
 * - now: 현재 시간
 * - 날짜가 바뀌었으면 true (year/month/date 중 하나라도 변경)
 */
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

/**
 * (TX 내부용) UserRewardSummary 업데이트 + 일자 롤오버 처리
 *
 * - summary가 없으면 신규 행 생성
 * - 날짜가 바뀌었으면:
 *   - yesterdayDFT ← 기존 todayDFT
 *   - todayDFT ← delta
 *   - totalDFT += delta
 * - 날짜가 같으면:
 *   - todayDFT += delta
 *   - totalDFT += delta
 */
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
    // 날짜가 바뀐 경우: today → yesterday로 롤오버
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
    // 같은 날짜: today, total에 delta 누적
    await tx.userRewardSummary.update({
      where: { userId },
      data: {
        totalDFT: (summary.totalDFT as unknown as Decimal).add(delta),
        todayDFT: (summary.todayDFT as unknown as Decimal).add(delta),
      },
    });
  }
}

/**
 * 외부에서 호출하는 요약 업데이트 함수(트랜잭션 래퍼)
 */
export async function bumpRewardSummary(
  userId: string,
  delta: Decimal,
  now = new Date()
) {
  return prisma.$transaction((tx) =>
    bumpRewardSummaryTx(tx, userId, delta, now)
  );
}

/**
 * (TX 내부용) UserRewardHistory 1건 추가
 *
 * - kind 에 따라 name을 문자열로 매핑
 * - refLevel / awardLevel / splitCount 는 note에 CSV 형태로 저장
 */
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

/**
 * 외부에서 호출하는 이력 추가 함수(트랜잭션 래퍼)
 */
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

/**
 * UserReferralStats: baseDailyDft 를 소스 유저의 총 daily allowance 에 1회 반영
 *
 * - stats가 없으면 신규 생성
 * - 있으면 totalDailyAllowanceDFT += baseDailyDft
 */
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

/**
 * MiningPayout 생성 + UserRewardSummary / History 갱신을
 * 하나의 트랜잭션 안에서 원자적으로 수행
 */
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
    // 1) MiningPayout 레코드 생성
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

    // 2) 요약 테이블 업데이트
    await bumpRewardSummaryTx(tx, args.beneficiaryUserId, args.amountDFT);

    // 3) 이력 테이블 추가
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
