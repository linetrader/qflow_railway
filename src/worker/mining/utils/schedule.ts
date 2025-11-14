// src/worker/mining/utils/schedule.ts
import type { MiningScheduleKind } from "@/generated/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

function isAllowedDOW(mask: number, d: dayjs.Dayjs): boolean {
  const bit = 1 << d.day(); // 0(일)~6(토)
  return (mask & bit) !== 0;
}

export function computeNextRunAt(args: {
  kind: MiningScheduleKind;
  intervalMinutes?: number | null;
  dailyAtMinutes?: number | null; // 0~1439
  timezone?: string | null; // IANA
  daysOfWeekMask?: number | null; // 기본 127(매일)
  from?: Date;
}): Date {
  const now = dayjs(args.from ?? new Date());

  if (args.kind === "INTERVAL") {
    const mins = Math.max(1, Number(args.intervalMinutes ?? 0));
    return now.add(mins, "minute").toDate();
  }

  // DAILY
  const tz = args.timezone ?? "Asia/Seoul";
  const mins = Number(args.dailyAtMinutes ?? 0);
  const mask = args.daysOfWeekMask ?? 127;

  const cur = now.tz(tz);
  const targetToday = cur
    .hour(Math.floor(mins / 60))
    .minute(mins % 60)
    .second(0)
    .millisecond(0);

  if (targetToday.isAfter(cur) && isAllowedDOW(mask, targetToday)) {
    return targetToday.toDate();
  }
  for (let i = 1; i <= 8; i++) {
    const cand = targetToday.add(i, "day");
    if (isAllowedDOW(mask, cand)) return cand.toDate();
  }
  return targetToday.add(1, "day").toDate();
}
