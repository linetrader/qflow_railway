// src/worker/mining/referral.ts
import { Decimal, MIN_MLM_LEVEL } from "./types";
import type { UplineNode } from "./types";
import { createPayout } from "./payout";
import { MiningRewardKind } from "@/generated/prisma";

/**
 * 추천 수익 분배:
 *
 * - baseDaily × planLevels[level].pct / 100 으로 각 레벨별 지급액 계산
 * - upline[level - 1] (1대=0, 2대=1, ...) 에 해당하는 유저에게 지급
 * - 유저 레벨이 MIN_MLM_LEVEL 미만이면 해당 레벨은 스킵
 *
 * @returns 총 지급된 금액(Decimal)
 */
export async function distributeReferral(args: {
  runId: string;
  sourceUserId: string;
  upline: UplineNode[];
  baseDaily: Decimal;
  planLevels: { level: number; pct: Decimal }[]; // 예: 1대 7, 2대 5, 3대 3 ...
}): Promise<Decimal> {
  let totalPaid = new Decimal(0);

  // 레벨 오름차순 정렬 (1대, 2대, 3대 ...)
  for (const { level, pct } of args.planLevels.sort(
    (a, b) => a.level - b.level
  )) {
    const parent = args.upline[level - 1]; // 1대 → index 0
    if (!parent) continue;
    if (parent.level < MIN_MLM_LEVEL) continue;

    const amt = args.baseDaily.mul(pct).div(100);
    if (amt.lte(0)) continue;

    await createPayout({
      runId: args.runId,
      sourceUserId: args.sourceUserId,
      beneficiaryUserId: parent.userId,
      kind: MiningRewardKind.MLM_REF,
      amountDFT: amt,
      refLevel: level,
    });

    totalPaid = totalPaid.add(amt);
  }

  return totalPaid;
}
