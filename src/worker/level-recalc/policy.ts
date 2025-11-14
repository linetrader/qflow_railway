// src/worker/level-recalc/policy.ts
import type { Tx } from "./types";

export async function getActiveLevelPolicy(tx: Tx) {
  return tx.levelPolicy.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      levels: {
        select: {
          level: true,
          groups: {
            select: {
              requirements: {
                select: {
                  kind: true,
                  amount: true,
                  count: true,
                  targetLevel: true,
                },
              },
            },
          },
        },
        orderBy: { level: "asc" },
      },
    },
  });
}
