// src/lib/centers/linking.ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

/**
 * Standalone wrapper: starts its own transaction and rebuilds all links
 */
export async function rebuildLinksForCenter(
  centerUserId: string
): Promise<{ createdCount: number }> {
  return prisma.$transaction(async (tx) =>
    rebuildLinksForCenterTx(tx, centerUserId)
  );
}

/**
 * Transactional variant: rebuild links for a center inside given tx
 * Steps:
 *  - delete existing links for this center
 *  - BFS by depth using batched IN queries
 *  - createMany(skipDuplicates) per level to assign {distance, rank}
 */
export async function rebuildLinksForCenterTx(
  tx: Prisma.TransactionClient,
  centerUserId: string
): Promise<{ createdCount: number }> {
  await tx.userCenterLink.deleteMany({ where: { centerUserId } });

  const visited = new Set<string>();
  let frontier: string[] = [];

  // depth 1: direct children of the center user
  const direct = await tx.referralEdge.findMany({
    where: { parentId: centerUserId },
    select: { childId: true },
    orderBy: { childId: "asc" }, // stable rank order
  });
  frontier = direct.map((d) => d.childId);
  for (const id of frontier) visited.add(id);

  let createdCount = 0;
  let depth = 1;

  while (frontier.length > 0) {
    // insert current depth
    const batch = frontier.map((userId, i) => ({
      userId,
      centerUserId,
      distance: depth,
      rank: i + 1,
    }));
    if (batch.length > 0) {
      await tx.userCenterLink.createMany({ data: batch, skipDuplicates: true });
      createdCount += batch.length;
    }

    // next depth candidates
    const children = await tx.referralEdge.findMany({
      where: { parentId: { in: frontier } },
      select: { childId: true },
      orderBy: { childId: "asc" },
    });

    const next: string[] = [];
    for (const c of children) {
      if (!visited.has(c.childId)) {
        visited.add(c.childId);
        next.push(c.childId);
      }
    }

    frontier = next;
    depth += 1;
  }

  return { createdCount };
}

/**
 * Standalone removal: delete all links for a center (no tx needed)
 */
export async function removeLinksForCenter(
  centerUserId: string
): Promise<number> {
  const res = await prisma.userCenterLink.deleteMany({
    where: { centerUserId },
  });
  return res.count;
}

/**
 * Transactional removal variant
 */
export async function removeLinksForCenterTx(
  tx: Prisma.TransactionClient,
  centerUserId: string
): Promise<number> {
  const res = await tx.userCenterLink.deleteMany({ where: { centerUserId } });
  return res.count;
}
