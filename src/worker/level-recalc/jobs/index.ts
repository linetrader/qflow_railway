// src/worker/level-recalc/jobs/index.ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

/** LevelRecalcJob.payload에 넣는 JSON 스키마 */
export type LevelRecalcJobPayload = {
  /** 구매 총액(USD) — 소수 정밀도 보존 위해 문자열 권장 */
  purchaseAmountUSD?: string;
  /** (선택) 중복 지급 방지용 히스토리 ID들 */
  historyIds?: string[];
};

type EnqueueArgs = Readonly<{
  userId: string;
  /** 스키마의 reason(예: 'PURCHASE' 등) */
  reason: string;
  payload: Readonly<LevelRecalcJobPayload>;
  /** (선택) 중복방지 키 컬럼이 스키마에 있을 때만 사용 */
  payloadKeyForDedupe?: string;
  /** (선택) 지정 시 사용, 기본 10 */
  maxAttempts?: number;
  /** (선택) 지정 시 사용, 기본 now() */
  scheduleAt?: Date;
}>;

/** 레벨 재산정 잡 enqueue (글로벌 커넥션 사용) */
export async function enqueueLevelRecalcJob(args: EnqueueArgs): Promise<void> {
  const dataBase: Prisma.LevelRecalcJobUncheckedCreateInput = {
    userId: args.userId,
    status: "PENDING", // LevelJobStatus
    reason: args.reason,
    attempts: 0,
    maxAttempts: args.maxAttempts ?? 10,
    scheduledAt: args.scheduleAt ?? new Date(),
    payload: args.payload as unknown as Prisma.InputJsonValue, // Json 컬럼
  };

  // payloadKeyForDedupe 컬럼이 스키마에 존재하는 프로젝트라면 함께 세팅
  const data: Prisma.LevelRecalcJobUncheckedCreateInput =
    typeof args.payloadKeyForDedupe === "string" &&
    args.payloadKeyForDedupe.length > 0
      ? ({
          ...dataBase,
          payloadKeyForDedupe: args.payloadKeyForDedupe,
        } as Prisma.LevelRecalcJobUncheckedCreateInput)
      : dataBase;

  await prisma.levelRecalcJob.create({ data });
}
