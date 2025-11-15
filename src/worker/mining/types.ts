// src/worker/mining/types.ts
import type { Prisma } from "@/generated/prisma";
export { Decimal } from "@prisma/client/runtime/library";

// select/include 에서는 boolean만 사용해야 하므로
// Prisma.UserGetPayload 를 사용해 필요한 필드만 타입으로 뽑아쓴다.
export type ParentWithUsername = Prisma.UserGetPayload<{
  select: { id: true; level: true; username: true };
}>;

export type EdgeWithParent = Prisma.ReferralEdgeGetPayload<{
  include: { parent: { select: { id: true; level: true; username: true } } };
}>;

// 상위 체인에서 사용하는 최소 단위 노드
export type UplineNode = { userId: string; level: number };

// 마이닝 시스템에서 사용하는 관리자 username (환경변수 없으면 "admin")
export const ADMIN_USERNAME = process.env.MINING_ADMIN_USERNAME ?? "admin";

// 정책: MLM 레벨 1 이상부터 보너스 수령 가능
export const MIN_MLM_LEVEL = 1;
