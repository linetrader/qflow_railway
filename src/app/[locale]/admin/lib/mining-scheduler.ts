// src/app/admin/lib/mining-scheduler.ts
import type { MiningScheduleKind } from "@/generated/prisma";

/** 요일 체크박스 → bitmask (0:일 ~ 6:토) */
export function buildDaysOfWeekMask(dows: string[] | null): number {
  if (!dows || dows.length === 0) return 127;
  let mask = 0;
  for (const s of dows) {
    const d = Number(s);
    if (Number.isInteger(d) && d >= 0 && d <= 6) mask |= 1 << d;
  }
  return mask || 127;
}

/** 뷰 라벨: 종류 */
export function kindToKo(kind: MiningScheduleKind) {
  return kind === "INTERVAL" ? "간격 실행" : "일별 실행";
}
/** 뷰 라벨: 활성 상태 */
export function activeToKo(active: boolean) {
  return active ? "실행 중" : "중지";
}
