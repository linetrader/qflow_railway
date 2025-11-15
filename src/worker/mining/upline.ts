// src/worker/mining/upline.ts
import { prisma } from "@/lib/prisma";
import { ADMIN_USERNAME } from "./types";
import type { EdgeWithParent, ParentWithUsername, UplineNode } from "./types";

/**
 * A. (추천용) 모든 상위 포함 체인:
 * - 자식 → 부모 순으로 admin 까지 전부 수집
 * - 레벨 상하, 단조 조건 등은 고려하지 않음
 */
export async function getUplineChainAll(
  childUserId: string
): Promise<UplineNode[]> {
  const chain: UplineNode[] = [];
  let currentId: string | null = childUserId;

  // 안전상 최대 10,000 단계까지만 탐색
  for (let i = 0; i < 10000; i++) {
    const edge: EdgeWithParent | null = await prisma.referralEdge.findUnique({
      where: { childId: currentId! }, // @@unique([childId]) 가정
      include: {
        parent: { select: { id: true, level: true, username: true } },
      },
    });
    if (!edge || !edge.parent) break;

    const parent: ParentWithUsername = edge.parent;
    chain.push({ userId: parent.id, level: parent.level ?? 0 });

    // admin 에 도달하면 종료
    if (parent.username === ADMIN_USERNAME) break;
    currentId = parent.id;
  }
  return chain;
}

/**
 * A'. getUplineChainAll 의 간단 캐시 버전
 * - cache key: "all:{childUserId}"
 */
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

/**
 * B. (레벨보너스용) 단조(non-decreasing) 상위 체인:
 *
 * - child → parent 순으로 올라가면서
 *   - 첫 부모는 무조건 포함
 *   - 이후 부모는 "직전 부모 레벨 이상" 일 때만 포함
 *   - 직전보다 레벨이 낮은 부모는 포함하지 않고, prevParentLevel도 갱신하지 않음
 * - 결과적으로 parent.level 이 비내림(non-decreasing) 구조
 */
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
      // parentLevel < prevParentLevel 인 경우:
      //   이 부모는 포함하지 않고 prevParentLevel도 유지 → 단조 성질 유지
      // prevParentLevel = parentLevel;  // 유지가 핵심이므로 갱신하지 않음
    }

    if (parent.username === ADMIN_USERNAME) break;
    currentId = parent.id;
  }

  return chain;
}

/**
 * B'. getUplineChainMonotonic 의 캐시 버전
 * - cache key: "mono:{childUserId}"
 */
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
