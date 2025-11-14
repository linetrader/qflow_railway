// src/app/api/(site)/packages/purchase/modules/referral.ts
import { Decimal } from "@prisma/client/runtime/library";
import type { LevelsByPackage, PurchaseItemInput, Tx } from "./common";
import { computeMaxLevelNeeded, buildUpline } from "./common";

type PayReferralArgs = {
  tx: Tx;
  userId: string;
  items: PurchaseItemInput[];
  historyIds: string[];
  priceMap: Map<string, Decimal>;
  levelsByPackage: LevelsByPackage;
};

/** 레퍼럴 커미션(USDT) 지급 */
export async function payReferralCommissions(
  args: PayReferralArgs
): Promise<void> {
  const { tx, userId, items, historyIds, priceMap, levelsByPackage } = args;

  const maxLevelNeeded = computeMaxLevelNeeded(levelsByPackage, items);
  const uplineUserIds = await buildUpline(tx, userId, maxLevelNeeded);

  // ✅ 업라인 부모들 중 "패키지를 1개 이상 보유"한 사용자만 선별 (한 번의 쿼리)
  const parentsWithAnyPackageRows = await tx.userPackage.findMany({
    where: { userId: { in: uplineUserIds } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const parentsWithAnyPackage = new Set<string>(
    parentsWithAnyPackageRows.map((r) => r.userId)
  );

  for (let idx = 0; idx < items.length; idx++) {
    const { packageId, units } = items[idx];
    const historyId = historyIds[idx];
    const baseAmount = priceMap.get(packageId)!.mul(units);
    const levels = levelsByPackage.get(packageId) ?? [];
    if (!levels.length) continue;

    for (const { level, percent } of levels) {
      if (level <= 0) continue;

      const beneficiaryUserId = uplineUserIds[level - 1];
      if (!beneficiaryUserId) continue;

      // ✅ 부모가 소유한 패키지가 "하나도 없으면" 이 부모는 스킵하고 다음 부모로
      if (!parentsWithAnyPackage.has(beneficiaryUserId)) {
        continue;
      }

      const commissionUSDT = baseAmount.mul(percent).div(new Decimal(100));
      if (commissionUSDT.lte(0)) continue;

      await tx.referralCommission.create({
        data: {
          buyerUserId: userId,
          beneficiaryUserId,
          historyId,
          packageId,
          level,
          percent,
          baseAmount,
          commissionUSDT,
          commissionDFT: new Decimal(0),
          status: "ACCRUED",
        },
      });

      await tx.userWallet.upsert({
        where: { userId: beneficiaryUserId },
        create: { userId: beneficiaryUserId, balanceUSDT: commissionUSDT },
        update: { balanceUSDT: { increment: commissionUSDT } },
      });

      await tx.walletTx.create({
        data: {
          userId: beneficiaryUserId,
          tokenCode: "USDT",
          txType: "DEPOSIT",
          amount: commissionUSDT,
          status: "COMPLETED",
          memo: `Referral L${level} commission for history ${historyId}`,
        },
      });
    }
  }
}
