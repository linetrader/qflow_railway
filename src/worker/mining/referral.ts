// src/worker/mining/referral.ts

import { Decimal, MIN_MLM_LEVEL } from "./types";
import type { UplineNode } from "./types";
import { createPayout } from "./payout";
import { MiningRewardKind } from "@/generated/prisma";

/** 추천수익 분배: baseDaily × (정책 퍼센트들) → 총 지급액 반환 */
export async function distributeReferral(args: {
  runId: string;
  sourceUserId: string;
  upline: UplineNode[];
  baseDaily: Decimal;
  planLevels: { level: number; pct: Decimal }[]; // 예: 1대 7, 2대 5, 3대 3 ...
}): Promise<Decimal> {
  let totalPaid = new Decimal(0);

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
