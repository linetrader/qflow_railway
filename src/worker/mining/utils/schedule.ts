// src/worker/mining/utils/schedule.ts
import type { MiningScheduleKind } from "@/generated/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 요일 비트마스크가 주어진 dayjs 날짜에 대해 허용되는지 검사
 * - mask: 비트마스크(0=일요일, 6=토요일에 해당 비트)
 * - d.day(): 0(일)~6(토)
 */
function isAllowedDOW(mask: number, d: dayjs.Dayjs): boolean {
  const bit = 1 << d.day(); // 0(일)~6(토)
  return (mask & bit) !== 0;
}

/**
 * 스케줄 종류(kind)에 따라 다음 실행 시각을 계산
 *
 * - kind === "INTERVAL":
 *   - intervalMinutes 만큼 현재(now)에서 더한 시간을 반환
 *   - 최소 1분 보장
 * - kind === "DAILY":
 *   - timezone, dailyAtMinutes(0~1439), daysOfWeekMask(요일 마스크)를 기준으로
 *     오늘 or 앞으로의 허용 요일 중 가장 가까운 실행 시각을 계산
 *
 * @param args.from 기준 시간 (지정 없으면 new Date())
 */
export function computeNextRunAt(args: {
  kind: MiningScheduleKind;
  intervalMinutes?: number | null;
  dailyAtMinutes?: number | null; // 0~1439 (분 단위)
  timezone?: string | null; // IANA 타임존 문자열
  daysOfWeekMask?: number | null; // 기본 127(매일)
  from?: Date;
}): Date {
  const now = dayjs(args.from ?? new Date());

  // ── 1) INTERVAL 스케줄: 단순히 intervalMinutes 후로 예약 ──
  if (args.kind === "INTERVAL") {
    const mins = Math.max(1, Number(args.intervalMinutes ?? 0));
    return now.add(mins, "minute").toDate();
  }

  // ── 2) DAILY 스케줄 ──
  const tz = args.timezone ?? "Asia/Seoul";
  const mins = Number(args.dailyAtMinutes ?? 0);
  const mask = args.daysOfWeekMask ?? 127; // 기본: 모든 요일 허용

  const cur = now.tz(tz);

  // 오늘의 목표 시각(시/분만 교체, 초/밀리초는 0으로)
  const targetToday = cur
    .hour(Math.floor(mins / 60))
    .minute(mins % 60)
    .second(0)
    .millisecond(0);

  // (1) 아직 오늘 목표 시간이 남아 있고, 오늘이 허용 요일이면 오늘 실행
  if (targetToday.isAfter(cur) && isAllowedDOW(mask, targetToday)) {
    return targetToday.toDate();
  }

  // (2) 내일부터 최대 8일 동안 허용 요일 탐색
  for (let i = 1; i <= 8; i++) {
    const cand = targetToday.add(i, "day");
    if (isAllowedDOW(mask, cand)) return cand.toDate();
  }

  // (3) 이론상 도달하지 않지만, 방어적으로 하루 뒤를 반환
  return targetToday.add(1, "day").toDate();
}
