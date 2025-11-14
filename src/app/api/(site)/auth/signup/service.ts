// src/app/api/(site)/auth/signup/service.ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  computeDepthForChild,
  decideGroupNoOrThrow,
  ensureParentGroupSummary,
} from "./referral";
import { generateReferralCode } from "./helpers";
import type { Prisma } from "@/generated/prisma";

export type SignupServiceInput = {
  username: string;
  email: string;
  password: string;
  name: string;
  countryCode: string | null;
  /** ✅ 필수로 변경 */
  referrerId: string;
  sponsorId: string | null;
  /** ✅ 제거됨: createEdge */
  requestedGroupNo?: number | null;
};

function getErrorCode(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as Record<string, unknown>).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

function extractUniqueTarget(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null) return undefined;
  const meta = (e as Record<string, unknown>).meta;
  if (meta && typeof meta === "object" && "target" in (meta as object)) {
    const t = (meta as Record<string, unknown>).target;
    if (Array.isArray(t)) return t.join(",");
    if (typeof t === "string") return t;
  }
  return undefined;
}

async function getNextPosition(
  tx: Prisma.TransactionClient,
  parentId: string,
  groupNo: number
): Promise<number> {
  const agg = await tx.referralEdge.aggregate({
    where: { parentId, groupNo },
    _max: { position: true },
  });
  const currentMax = agg._max.position ?? 0;
  return currentMax + 1;
}

export async function signupWithTransaction(input: SignupServiceInput) {
  const {
    username,
    email,
    password,
    name,
    countryCode,
    referrerId,
    sponsorId,
    requestedGroupNo,
  } = input;

  const passwordHash = await bcrypt.hash(password, 12);

  const MAX_RETRY = 3;
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    const referralCode = generateReferralCode();

    try {
      const user = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // 1) User
          const u = await tx.user.create({
            data: {
              username,
              email,
              name,
              passwordHash,
              countryCode,
              /** ✅ 필수 */
              referrerId,
              sponsorId,
              referralCode,
            },
            select: {
              id: true,
              username: true,
              email: true,
              name: true,
              countryCode: true,
              referrerId: true,
              sponsorId: true,
              referralCode: true,
              createdAt: true,
            },
          });

          // 2) Wallet
          await tx.userWallet.create({ data: { userId: u.id } });

          // 3) Reward Summary
          await tx.userRewardSummary.create({ data: { userId: u.id } });

          // 4) Referral Stats
          await tx.userReferralStats.create({ data: { userId: u.id } });

          // 5) ✅ Referral Edge (+ 부모 그룹 요약 보장) — 항상 수행
          const depth = await computeDepthForChild(tx, referrerId);
          const finalGroupNo = await decideGroupNoOrThrow({
            tx,
            parentId: referrerId,
            requested: requestedGroupNo ?? null,
          });
          const position = await getNextPosition(tx, referrerId, finalGroupNo);

          await tx.referralEdge.create({
            data: {
              parentId: referrerId,
              childId: u.id,
              groupNo: finalGroupNo,
              position,
              depth,
            },
          });

          await ensureParentGroupSummary(tx, referrerId, finalGroupNo);

          return u;
        }
      );

      return { ok: true as const, user };
    } catch (e: unknown) {
      const code = getErrorCode(e);

      if (code === "P2002") {
        const target = extractUniqueTarget(e);
        if (typeof target === "string" && target.includes("referralCode")) {
          if (attempt < MAX_RETRY - 1) {
            continue; // 추천코드 충돌이면 재시도
          }
        }
        return { ok: false as const, code: "VALIDATION_ERROR" as const };
      }

      if (code === "INVALID_REQUESTED_GROUP_NO") {
        return {
          ok: false as const,
          code: "INVALID_REQUESTED_GROUP_NO" as const,
        };
      }

      return { ok: false as const, code: "UNKNOWN" as const };
    }
  }

  return { ok: false as const, code: "UNKNOWN" as const };
}
