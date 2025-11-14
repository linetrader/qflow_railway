// src/app/api/(site)/packages/purchase/modules/center.ts
import { Decimal } from "@prisma/client/runtime/library";
import type { Tx } from "./common";

type PayCenterArgs = {
  tx: Tx;
  userId: string;
  historyIds: string[];
  baseAmounts: Decimal[]; // historyIds에 동일 인덱스로 매핑
  now: Date;
};

/** 연결된 모든 활성 센터장에게 센터피(USDT) 지급 */
export async function payCenterFees(args: PayCenterArgs): Promise<void> {
  const { tx, userId, historyIds, baseAmounts, now } = args;

  // 1) 유저↔센터장 링크 (가까운 순)
  const links = await tx.userCenterLink.findMany({
    where: { userId },
    select: { centerUserId: true },
    orderBy: [{ distance: "asc" }, { rank: "asc" }],
  });
  if (links.length === 0) return;

  // 2) 중복 제거 후 활성/기간 유효 센터장만
  const centerIds = Array.from(new Set(links.map((l) => l.centerUserId)));
  const managers = await tx.centerManager.findMany({
    where: {
      userId: { in: centerIds },
      isActive: true,
      OR: [
        { effectiveFrom: { lte: now }, effectiveTo: null },
        { effectiveFrom: { lte: now }, effectiveTo: { gte: now } },
      ],
    },
    select: { userId: true, percent: true },
  });
  if (managers.length === 0) return;

  // 3) 각 센터장 × 각 히스토리: 커미션 생성/입금/WalletTx
  for (const m of managers) {
    const percent = new Decimal(m.percent.toString());
    if (percent.lte(0)) continue;

    for (let i = 0; i < historyIds.length; i++) {
      const historyId = historyIds[i];
      const baseAmount = baseAmounts[i];
      const amount = baseAmount.mul(percent).div(new Decimal(100));
      if (amount.lte(0)) continue;

      await tx.centerCommission.create({
        data: {
          centerUserId: m.userId,
          sourceHistoryId: historyId,
          buyerUserId: userId,
          percent,
          baseAmount,
          amount,
          status: "ACCRUED",
          memo: `Center commission for history ${historyId}`,
        },
      });

      await tx.userWallet.upsert({
        where: { userId: m.userId },
        create: { userId: m.userId, balanceUSDT: amount },
        update: { balanceUSDT: { increment: amount } },
      });

      await tx.walletTx.create({
        data: {
          userId: m.userId,
          tokenCode: "USDT",
          txType: "DEPOSIT",
          amount,
          status: "COMPLETED",
          memo: `Center commission for history ${historyId}`,
        },
      });
    }
  }
}
