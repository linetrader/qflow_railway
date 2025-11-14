// src/worker/level-recalc/jobs/enqueue.ts
import type { Prisma } from "@/generated/prisma";

export type LevelRecalcJobPayload = {
  /** 구매 총액(USD). 소수/정밀도 보존 위해 string 권장 */
  purchaseAmountUSD?: string;
  /** (선택) 중복 지급 방지용 히스토리 ID들 */
  historyIds?: string[];
};

export async function enqueueLevelRecalcJob(
  tx: Prisma.TransactionClient,
  userId: string,
  payload: Readonly<LevelRecalcJobPayload>,
  opts?: Readonly<{
    reason?: string; // 예: 'PURCHASE' | 'MANUAL' 등 (스키마에 맞춰 문자열)
    scheduleAt?: Date; // 기본 now()
    maxAttempts?: number; // 기본 10
  }>
): Promise<void> {
  const data: Prisma.LevelRecalcJobUncheckedCreateInput = {
    userId,
    status: "PENDING", // Prisma Enum: LevelJobStatus
    reason: opts?.reason ?? "PURCHASE", // ★ 필수 필드 — 누락 시 에러 발생
    attempts: 0,
    maxAttempts: opts?.maxAttempts ?? 10,
    scheduledAt: opts?.scheduleAt ?? new Date(),
    // 선택 필드들은 스키마 default/null이면 굳이 지정하지 않음
    payload: payload as unknown as Prisma.InputJsonValue, // Json 타입으로 캐스팅
  };

  await tx.levelRecalcJob.create({ data });
}
