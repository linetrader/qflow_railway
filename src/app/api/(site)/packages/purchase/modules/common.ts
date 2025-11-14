// src/app/api/(site)/packages/purchase/modules/common.ts
import type { Prisma } from "@/generated/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export type Tx = Prisma.TransactionClient;

export type PurchaseItemInput = {
  packageId: string;
  units: number;
};

export type EdgeParentPick = { parentId: string };
export type EdgeParentGroupPick = { parentId: string; groupNo: number | null };

export type LevelPercent = { level: number; percent: Decimal };
export type LevelsByPackage = Map<string, LevelPercent[]>;

/** upline 최대 필요 레벨 계산 */
export function computeMaxLevelNeeded(
  levelsByPackage: LevelsByPackage,
  items: PurchaseItemInput[]
): number {
  let maxLevelNeeded = 0;
  for (const it of items) {
    const lv = levelsByPackage.get(it.packageId) ?? [];
    if (lv.length) {
      const maxLv = Math.max(...lv.map((x) => x.level));
      if (maxLv > maxLevelNeeded) maxLevelNeeded = maxLv;
    }
  }
  return maxLevelNeeded;
}

/** child → parent 체인 상단으로 최대 N단 추적 (부모 ID 배열) */
export async function buildUpline(
  tx: Tx,
  userId: string,
  maxLevelNeeded: number
): Promise<string[]> {
  const uplineUserIds: string[] = [];
  if (maxLevelNeeded <= 0) return uplineUserIds;

  let currentChildId: string | null = userId;
  for (let lvl = 1; lvl <= maxLevelNeeded; lvl++) {
    if (!currentChildId) break;

    const edge: EdgeParentPick | null = await tx.referralEdge.findFirst({
      where: { childId: currentChildId },
      select: { parentId: true },
    });

    const parentId: string | null = edge?.parentId ?? null;
    if (!parentId) break;
    uplineUserIds.push(parentId);
    currentChildId = parentId;
  }
  return uplineUserIds;
}
