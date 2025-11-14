// src/app/api/admin/mining/scheduler/_utils/nextDaily.ts

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

// 0(일)~6(토) bitmask
function isAllowedDOW(mask: number, d: dayjs.Dayjs) {
  const bit = 1 << d.day();
  return (mask & bit) !== 0;
}

/** 지금 시점 기준, 다음 DAILY 실행시각 */
export function nextDailyFromNow(
  dailyAtMinutes: number,
  tz: string,
  mask = 127,
  from?: Date
): Date {
  const now = dayjs(from ?? new Date()).tz(tz);
  const hh = Math.floor(dailyAtMinutes / 60);
  const mm = dailyAtMinutes % 60;

  const target = now.hour(hh).minute(mm).second(0).millisecond(0);

  // 오늘 아직 안 지났고 요일 허용이면 오늘, 아니면 내일 이후 허용 요일 찾기
  if (target.isAfter(now) && isAllowedDOW(mask, target)) {
    return target.toDate();
  }
  for (let i = 1; i <= 8; i++) {
    const cand = target.add(i, "day");
    if (isAllowedDOW(mask, cand)) return cand.toDate();
  }
  // 이론상 도달 X
  return target.add(1, "day").toDate();
}
