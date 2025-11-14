// src/worker/level-recalc/recalc.ts
import { Decimal } from "@prisma/client/runtime/library";
import { LevelRequirementKind, type Tx } from "./types";
import { getActiveLevelPolicy } from "./policy";
import {
  computeNodeAmountUSD,
  countDirectReferrals,
  computeGroupSalesUSD,
  countDirectDownlineAtLevel,
} from "./metrics";

/** 단일 사용자 레벨 재산정(정책 기준). 갱신된 레벨(또는 null)을 반환 */
export async function recalcLevelForUser(
  tx: Tx,
  userId: string
): Promise<number | null> {
  const policy = await getActiveLevelPolicy(tx);
  if (!policy) return null;

  const nodeAmount = await computeNodeAmountUSD(tx, userId);
  const directRefCount = await countDirectReferrals(tx, userId);
  const groupSales = await computeGroupSalesUSD(tx, userId);

  const levelsDesc = [...policy.levels].sort((a, b) => b.level - a.level);

  for (const lv of levelsDesc) {
    let okThisLevel = false;

    for (const g of lv.groups ?? []) {
      let andOk = true;
      for (const r of g.requirements ?? []) {
        const kind = r.kind as LevelRequirementKind;
        if (kind === LevelRequirementKind.NODE_AMOUNT_MIN) {
          const need = new Decimal((r.amount ?? "0").toString());
          if (nodeAmount.lt(need)) {
            andOk = false;
            break;
          }
        } else if (kind === LevelRequirementKind.DIRECT_REFERRAL_COUNT_MIN) {
          const need = r.count ?? 0;
          if (directRefCount < need) {
            andOk = false;
            break;
          }
        } else if (kind === LevelRequirementKind.GROUP_SALES_AMOUNT_MIN) {
          const need = new Decimal((r.amount ?? "0").toString());
          if (groupSales.lt(need)) {
            andOk = false;
            break;
          }
        } else if (
          kind === LevelRequirementKind.DIRECT_DOWNLINE_LEVEL_COUNT_MIN
        ) {
          const targetLevel = r.targetLevel ?? 0;
          const need = r.count ?? 0;
          const have = await countDirectDownlineAtLevel(
            tx,
            userId,
            targetLevel
          );
          if (have < need) {
            andOk = false;
            break;
          }
        } else {
          andOk = false;
          break;
        }
      }
      if (andOk) {
        okThisLevel = true;
        break;
      }
    }

    if (okThisLevel) {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { level: true },
      });
      if (!current) return null;
      if (current.level !== lv.level) {
        await tx.user.update({
          where: { id: userId },
          data: { level: lv.level },
        });
      }
      return lv.level;
    }
  }

  const current = await tx.user.findUnique({
    where: { id: userId },
    select: { level: true },
  });
  if (current && current.level !== 0) {
    await tx.user.update({ where: { id: userId }, data: { level: 0 } });
    return 0;
  }
  return current ? current.level : 0;
}

/** 상위(parentId) 1단계 조회 */
export async function getParentId(
  tx: Tx,
  childId: string
): Promise<string | null> {
  const edge = await tx.referralEdge.findFirst({
    where: { childId },
    select: { parentId: true },
  });
  return edge?.parentId ?? null;
}
