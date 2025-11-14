// src/app/api/(site)/auth/signup/referral.ts
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

/** 아이디(소문자) 또는 레퍼럴 코드(대문자)로 사용자 ID 찾기 */
export async function resolveUserIdByUsernameOrReferral(
  input: string
): Promise<string | null> {
  const usernameCandidate = input.toLowerCase();
  const referralCandidate = input.toUpperCase();

  const byUsername = await prisma.user.findUnique({
    where: { username: usernameCandidate },
    select: { id: true },
  });
  if (byUsername) return byUsername.id;

  const byReferral = await prisma.user.findUnique({
    where: { referralCode: referralCandidate },
    select: { id: true },
  });
  return byReferral?.id ?? null;
}

/** 기본 referrer(admin) 선택 — 없으면 null */
export async function findDefaultReferrerId(
  usernameLowerOrEnv: string
): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { username: usernameLowerOrEnv },
    select: { id: true },
  });
  return u?.id ?? null;
}

/**
 * 부모의 depth를 찾아 +1 리턴 (없으면 1)
 * - ReferralEdge 스키마: @@unique([childId]) 에 맞춰 childId 기준 단건 조회
 */
export async function computeDepthForChild(
  tx: Prisma.TransactionClient,
  parentId: string
): Promise<number> {
  const parentEdge = await tx.referralEdge.findUnique({
    where: { childId: parentId },
    select: { depth: true },
  });
  const parentDepth = parentEdge?.depth ?? 0;
  return parentDepth + 1;
}

/**
 * groupNo 최종 결정 (명시/자동)
 * - 명시 requested가 유효(정수 ≥ 1)이면 그대로 사용
 * - 자동일 경우 ReferralGroupSummary(uniq: userId, groupNo)의 최대값 + 1
 */
export async function decideGroupNoOrThrow(opts: {
  tx: Prisma.TransactionClient;
  parentId: string;
  requested?: number | null;
}): Promise<number> {
  const { tx, parentId, requested } = opts;

  // 명시된 번호가 유효하면 그대로 사용 (1 이상 정수만 허용)
  if (requested != null) {
    if (!Number.isInteger(requested) || requested <= 0) {
      const err = new Error("INVALID_REQUESTED_GROUP_NO");
      (err as unknown as { code: string }).code = "INVALID_REQUESTED_GROUP_NO";
      throw err;
    }
    return requested;
  }

  // 자동 할당: ReferralGroupSummary 기준으로 현재 최대 groupNo + 1
  const agg = await tx.referralGroupSummary.aggregate({
    where: { userId: parentId },
    _max: { groupNo: true },
  });
  const currentMax = agg._max.groupNo ?? 0;
  return currentMax + 1;
}

/** 부모의 (userId, groupNo) ReferralGroupSummary 보장 (없으면 생성) */
export async function ensureParentGroupSummary(
  tx: Prisma.TransactionClient,
  parentId: string,
  groupNo: number
): Promise<void> {
  await tx.referralGroupSummary.upsert({
    where: { userId_groupNo: { userId: parentId, groupNo } },
    update: {},
    create: { userId: parentId, groupNo }, // Decimal 필드는 default(0) 사용
  });
}

/**
 * 신규 가입한 child의 부모(Group) 요약을 보장
 * - Edge(childId=new user)에서 parentId/groupNo를 조회
 * - groupNo가 null이면 0으로 치환(기본 그룹)
 * - 트랜잭션 외부/내부 모두에서 재사용 가능(tx 주입 시 내부 사용)
 */
export async function ensureParentGroupSummaryForChildSignup(
  childUserId: string,
  opts?: { tx?: Prisma.TransactionClient }
): Promise<void> {
  const db = opts?.tx ?? prisma;

  const edge = await db.referralEdge.findUnique({
    where: { childId: childUserId },
    select: { parentId: true, groupNo: true },
  });

  if (!edge?.parentId) return;

  const groupNo = edge.groupNo ?? 0; // null → 0 기본 그룹
  await db.referralGroupSummary.upsert({
    where: { userId_groupNo: { userId: edge.parentId, groupNo } },
    update: {},
    create: { userId: edge.parentId, groupNo }, // Decimal 필드는 default(0)
  });
}
