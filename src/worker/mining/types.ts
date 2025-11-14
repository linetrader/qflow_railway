// src/worker/mining/types.ts

import type { Prisma } from "@/generated/prisma";
export { Decimal } from "@prisma/client/runtime/library";

// select/include에는 boolean만 사용
export type ParentWithUsername = Prisma.UserGetPayload<{
  select: { id: true; level: true; username: true };
}>;

export type EdgeWithParent = Prisma.ReferralEdgeGetPayload<{
  include: { parent: { select: { id: true; level: true; username: true } } };
}>;

export type UplineNode = { userId: string; level: number };

export const ADMIN_USERNAME = process.env.MINING_ADMIN_USERNAME ?? "admin";

// 정책: 레벨 1 이상 수령 가능 (요청 기준)
export const MIN_MLM_LEVEL = 1;
