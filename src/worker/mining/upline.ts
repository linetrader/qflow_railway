// src/worker/mining/upline.ts

import { prisma } from "@/lib/prisma";
import { ADMIN_USERNAME } from "./types";
import type { EdgeWithParent, ParentWithUsername, UplineNode } from "./types";

/** A. (추천용) 모든 상위 포함: 레벨 상하와 무관하게 admin까지 전부 수집 */
export async function getUplineChainAll(
  childUserId: string
): Promise<UplineNode[]> {
  const chain: UplineNode[] = [];
  let currentId: string | null = childUserId;

  for (let i = 0; i < 10000; i++) {
    const edge: EdgeWithParent | null = await prisma.referralEdge.findUnique({
      where: { childId: currentId! }, // @@unique([childId]) 전제
      include: {
        parent: { select: { id: true, level: true, username: true } },
      },
    });
    if (!edge || !edge.parent) break;

    const parent: ParentWithUsername = edge.parent;
    chain.push({ userId: parent.id, level: parent.level ?? 0 });

    if (parent.username === ADMIN_USERNAME) break;
    currentId = parent.id;
  }
  return chain;
}

/** A'. 캐시 버전 */
export async function getUplineChainAllCached(
  childUserId: string,
  cache: Map<string, UplineNode[]>
): Promise<UplineNode[]> {
  const key = `all:${childUserId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const chain = await getUplineChainAll(childUserId);
  cache.set(key, chain);
  return chain;
}

/** B. (레벨보너스용) 직전 부모보다 레벨 낮으면 제외하는 단조(비내림) 체인 */
export async function getUplineChainMonotonic(
  childUserId: string
): Promise<UplineNode[]> {
  const child = await prisma.user.findUnique({
    where: { id: childUserId },
    select: { id: true, level: true, username: true },
  });
  if (!child) return [];

  const chain: UplineNode[] = [];
  let currentId: string | null = childUserId;
  let prevParentLevel: number | null = null;

  for (let i = 0; i < 10000; i++) {
    const edge: EdgeWithParent | null = await prisma.referralEdge.findUnique({
      where: { childId: currentId! },
      include: {
        parent: { select: { id: true, level: true, username: true } },
      },
    });
    if (!edge || !edge.parent) break;

    const parent: ParentWithUsername = edge.parent;
    const parentLevel = parent.level ?? 0;

    if (prevParentLevel === null) {
      // 첫 부모는 무조건 포함 + prev 갱신
      chain.push({ userId: parent.id, level: parentLevel });
      prevParentLevel = parentLevel;
    } else if (parentLevel >= prevParentLevel) {
      // 이전보다 크거나 같으면 포함 + prev 갱신
      chain.push({ userId: parent.id, level: parentLevel });
      prevParentLevel = parentLevel;
    } else {
      // 🔧 낮으면 포함하지 않고 prev 유지(덮어쓰지 않음) — 단조 성질 보존
      // prevParentLevel = parentLevel;  // (삭제)
    }

    if (parent.username === ADMIN_USERNAME) break;
    currentId = parent.id;
  }

  return chain;
}

/** B'. 캐시 버전 */
export async function getUplineChainMonotonicCached(
  childUserId: string,
  cache: Map<string, UplineNode[]>
): Promise<UplineNode[]> {
  const key = `mono:${childUserId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const chain = await getUplineChainMonotonic(childUserId);
  cache.set(key, chain);
  return chain;
}
