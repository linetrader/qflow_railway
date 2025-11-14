// src/worker/level-recalc/metrics.ts
import { Decimal } from "@prisma/client/runtime/library";
import type { Tx } from "./types";

// 본인 노드 금액(USD) = Σ(UserPackage.quantity × Package.price)
export async function computeNodeAmountUSD(
  tx: Tx,
  userId: string
): Promise<Decimal> {
  const rows = await tx.userPackage.findMany({
    where: { userId },
    select: { quantity: true, package: { select: { price: true } } },
  });
  let sum = new Decimal(0);
  for (const r of rows) {
    const qty = new Decimal(r.quantity);
    const price = new Decimal(r.package.price.toString());
    sum = sum.add(qty.mul(price));
  }
  return sum;
}

export function countDirectReferrals(tx: Tx, userId: string) {
  return tx.referralEdge.count({ where: { parentId: userId } });
}

export async function computeGroupSalesUSD(
  tx: Tx,
  userId: string
): Promise<Decimal> {
  const rows = await tx.referralGroupSummary.findMany({
    where: { userId },
    select: { salesVolume: true },
  });
  let sum = new Decimal(0);
  for (const r of rows) sum = sum.add(new Decimal(r.salesVolume.toString()));
  return sum;
}

export function countDirectDownlineAtLevel(
  tx: Tx,
  userId: string,
  targetLevel: number
) {
  return tx.user.count({
    where: {
      level: targetLevel, // 필요시 gte 확장 가능
      uplineEdges: { some: { parentId: userId } },
    },
  });
}
