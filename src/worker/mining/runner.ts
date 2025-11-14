// src/worker/mining/runner.ts
import { prisma } from "@/lib/prisma";
import {
  MiningRunStatus,
  MiningRewardKind,
  MiningScheduleKind,
} from "@/generated/prisma";
import { Decimal } from "./types";
import { createPayout, bumpReferralStatsForSource } from "./payout";
import { distributeReferral } from "./referral";
import {
  buildLevelThresholds,
  distributeLevelBonusByFlow,
} from "./level-bonus";
import {
  getUplineChainAllCached,
  getUplineChainMonotonicCached,
} from "./upline";
import type { UplineNode } from "./types";

// ---- time utils (for DAILY schedules) ----
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

// ---- loop utils ----
import { setTimeout as sleep } from "node:timers/promises";

const LOOP_INTERVAL_MS = 10_000; // 러너 기본 폴링 간격(정책상 고정; 필요 시 DB에서 가져오도록 확장 가능)

// dayjs().day(): 0(일)~6(토)
function isAllowedDOW(mask: number, d: dayjs.Dayjs) {
  const bit = 1 << d.day();
  return (mask & bit) !== 0;
}

function computeNextRunAt(args: {
  kind: MiningScheduleKind;
  intervalMinutes?: number | null;
  dailyAtMinutes?: number | null;
  timezone?: string | null;
  daysOfWeekMask?: number | null;
  from?: Date;
}): Date {
  const now = dayjs(args.from ?? new Date());

  if (args.kind === MiningScheduleKind.INTERVAL) {
    const mins = Math.max(1, Number(args.intervalMinutes ?? 0));
    return now.add(mins, "minute").toDate();
  }

  // DAILY
  const tz = args.timezone ?? "Asia/Seoul";
  const mins = Number(args.dailyAtMinutes ?? 0); // 0~1439
  const mask = args.daysOfWeekMask ?? 127; // 기본: 매일

  const cur = now.tz(tz);
  const targetToday = cur
    .hour(Math.floor(mins / 60))
    .minute(mins % 60)
    .second(0)
    .millisecond(0);

  if (targetToday.isAfter(cur) && isAllowedDOW(mask, targetToday)) {
    return targetToday.toDate();
  }
  // 내일부터 허용 요일 탐색 (최대 8일 루프)
  for (let i = 1; i <= 8; i++) {
    const cand = targetToday.add(i, "day");
    if (isAllowedDOW(mask, cand)) return cand.toDate();
  }
  // 이론상 도달 X
  return targetToday.add(1, "day").toDate();
}

/** 실행 대상 스케줄 수집: DB에서 due만 선별 (형식 안전 필터 포함) */
export async function collectDueSchedules(now: Date) {
  return prisma.miningSchedule.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
      OR: [
        { kind: "INTERVAL", intervalMinutes: { not: null } },
        { kind: "DAILY", dailyAtMinutes: { not: null } },
      ],
    },
    include: { policy: true },
  });
}

/** 런 시작(정책 스냅샷) + 동시 실행 가드 + nextRunAt 계산 */
export async function startRun(scheduleId: string) {
  return prisma.$transaction(async (tx) => {
    const schedule = await tx.miningSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        policy: {
          include: { mlmReferralPlan: true, levelBonusPlan: true },
        },
      },
    });
    if (!schedule) throw new Error("Schedule not found");

    // 동일 스케줄에서 RUNNING이 이미 있으면 차단
    const running = await tx.miningRun.findFirst({
      where: { scheduleId, status: MiningRunStatus.RUNNING },
      select: { id: true },
    });
    if (running)
      throw new Error("A run is already in progress for this schedule");

    const run = await tx.miningRun.create({
      data: {
        scheduleId: schedule.id,
        policyId: schedule.policy.id,
        snapCompanyPct: schedule.policy.companyPct,
        snapSelfPct: schedule.policy.selfPct,
        snapMlmPct: schedule.policy.mlmPct,
        snapMlmReferralPlanId: schedule.policy.mlmReferralPlanId,
        snapLevelBonusPlanId: schedule.policy.levelBonusPlanId,
        status: MiningRunStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    // ✅ kind에 따라 nextRunAt 재계산
    const next = computeNextRunAt({
      kind: schedule.kind as MiningScheduleKind,
      intervalMinutes: schedule.intervalMinutes ?? null,
      dailyAtMinutes: schedule.dailyAtMinutes ?? null,
      timezone: schedule.timezone ?? null,
      daysOfWeekMask: schedule.daysOfWeekMask ?? null,
      from: new Date(),
    });

    await tx.miningSchedule.update({
      where: { id: schedule.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: next,
      },
    });

    return run;
  });
}

/** 런 실행(지급 생성) */
export async function executeRun(runId: string) {
  const run = await prisma.miningRun.findUnique({
    where: { id: runId },
    include: {
      policy: {
        include: {
          mlmReferralPlan: { include: { levels: true } },
          levelBonusPlan: { include: { items: true } },
          companyUser: true,
        },
      },
    },
  });
  if (!run) throw new Error("Run not found");

  const policy = run.policy;

  // 보유자 로드: 필요한 필드만 select
  const holders = await prisma.userPackage.findMany({
    select: {
      userId: true,
      quantity: true,
      packageId: true,
      user: { select: { level: true } },
      package: { select: { dailyDftAmount: true } },
    },
    where: { quantity: { gt: 0 } },
  });

  // userId → { level, items[] } 집계
  const byUser = new Map<
    string,
    { level: number; items: { daily: Decimal; pkgId: string; qty: number }[] }
  >();

  for (const up of holders) {
    const daily = (up.package.dailyDftAmount as unknown as Decimal).mul(
      up.quantity
    );
    const prev = byUser.get(up.userId);
    if (!prev) {
      byUser.set(up.userId, {
        level: up.user.level ?? 0,
        items: [{ daily, pkgId: up.packageId, qty: up.quantity }],
      });
    } else {
      prev.items.push({ daily, pkgId: up.packageId, qty: up.quantity });
    }
  }

  // 불변 계산(전 유저 공통)
  const referralTotalPct = policy.mlmReferralPlan.levels.reduce(
    (acc, x) => acc.add(x.percent as unknown as Decimal),
    new Decimal(0)
  );
  const mlmTotalPct =
    (run.snapMlmPct as unknown as Decimal) ??
    new Decimal((run.snapMlmPct as unknown as number) ?? 0);

  const levelThresholds = buildLevelThresholds(
    policy.levelBonusPlan.items.map((x) => ({
      level: x.level,
      pct: x.percent as unknown as Decimal,
    }))
  );

  // 체인 캐시
  const uplineCache = new Map<string, UplineNode[]>();

  for (const [userId, info] of byUser.entries()) {
    const baseDaily = info.items.reduce(
      (acc, x) => acc.add(x.daily),
      new Decimal(0)
    );
    if (baseDaily.lte(0)) continue;

    // 소스 유저 통계
    await bumpReferralStatsForSource(userId, baseDaily);

    const selfAmt = baseDaily.mul(run.snapSelfPct).div(100);
    const companyAmt = baseDaily.mul(run.snapCompanyPct).div(100);

    // 레벨 보너스 퍼센트 = MLM 총퍼센트 − 추천 퍼센트 합 (음수 방지)
    let levelBonusPct = mlmTotalPct.sub(referralTotalPct);
    if (levelBonusPct.lt(0)) levelBonusPct = new Decimal(0);

    // 고정 레벨 풀
    const levelPoolFixed = baseDaily.mul(levelBonusPct).div(100);

    // SELF
    await createPayout({
      runId: run.id,
      sourceUserId: userId,
      beneficiaryUserId: userId,
      amountDFT: selfAmt,
      baseDailyDft: baseDaily,
      userNodeQuantity: info.items.reduce((a, b) => a + b.qty, 0),
      kind: MiningRewardKind.SELF,
    });

    // COMPANY
    await createPayout({
      runId: run.id,
      sourceUserId: userId,
      beneficiaryUserId: policy.companyUserId,
      amountDFT: companyAmt,
      baseDailyDft: baseDaily,
      userNodeQuantity: info.items.reduce((a, b) => a + b.qty, 0),
      kind: MiningRewardKind.COMPANY,
    });

    // 추천: ★ 모든 상위 포함 체인 사용
    const uplineForReferral = await getUplineChainAllCached(
      userId,
      uplineCache
    );
    await distributeReferral({
      runId: run.id,
      sourceUserId: userId,
      upline: uplineForReferral,
      baseDaily,
      planLevels: policy.mlmReferralPlan.levels.map((x) => ({
        level: x.level,
        pct: x.percent as unknown as Decimal,
      })),
    });

    // 레벨 보너스: ★ 단조 규칙 체인 사용 + sourceLevel 필터
    if (levelPoolFixed.gt(0)) {
      const uplineForLevel = await getUplineChainMonotonicCached(
        userId,
        uplineCache
      );
      await distributeLevelBonusByFlow({
        runId: run.id,
        sourceUserId: userId,
        sourceLevel: info.level ?? 0,
        upline: uplineForLevel,
        levelPoolRemaining: levelPoolFixed,
        levelThresholds,
      });
    }
  }

  await prisma.miningRun.update({
    where: { id: run.id },
    data: { status: MiningRunStatus.COMPLETED, finishedAt: new Date() },
  });
}

/* ────────────────────────────────────────────────────────────────────
   러너 루프 (tick → startRun → executeRun)
   ──────────────────────────────────────────────────────────────────── */

export async function tick(now = new Date()) {
  const due = await collectDueSchedules(now);
  if (!due.length) return 0;

  let runCount = 0;
  for (const s of due) {
    try {
      const run = await startRun(s.id);
      await executeRun(run.id);
      runCount++;
    } catch (e) {
      // 동시에 여러 프로세스가 startRun 경합 시, "in progress" 에러 가능 → 스킵
      console.error("[mining] schedule run error:", e);
    }
  }
  return runCount;
}

export async function runOnce() {
  const n = await tick(new Date());
  console.log(`[mining] runOnce: executed ${n} run(s)`);
}

let stopping = false;
function installSignalHandlers() {
  const onStop = (sig: string) => {
    console.log(`[mining:runner] ${sig} received -> graceful stop`);
    stopping = true;
  };
  process.on("SIGINT", () => onStop("SIGINT"));
  process.on("SIGTERM", () => onStop("SIGTERM"));
}

/** 무한 루프: due 스케줄을 폴링 */
export async function runLoop(intervalMs = LOOP_INTERVAL_MS) {
  installSignalHandlers();
  console.log(`[mining:runner] loop start (interval=${intervalMs}ms)`);

  // ✅ 시작 직후에는 실행하지 않고 먼저 대기 -> "무조건 1회 실행" 방지
  while (!stopping) {
    await sleep(intervalMs);
    if (stopping) break;

    try {
      await runOnce(); // runOnce는 due 스케줄이 없으면 아무것도 안 함
    } catch (e) {
      console.error("[mining:runner] runOnce error:", e);
    }
  }

  console.log("[mining:runner] loop stopped");
}

/* ────────────────────────────────────────────────────────────────────
   직접 실행 시 main() 진입
   (node/tsx src/worker/mining/runner.ts)
   ──────────────────────────────────────────────────────────────────── */
async function main() {
  const args = process.argv.slice(2);
  const forceOnce = args.includes("--once");
  if (forceOnce) {
    await runOnce();
    return;
  }
  await runLoop();
}

/** ★ ESM 안전한 “직접 실행” 가드 */
const directRun = (() => {
  try {
    // Node ESM에서 현재 프로세스가 실행한 엔트리 파일과 이 모듈의 url을 비교
    const entry = process.argv[1];
    if (!entry) return false;
    const entryUrl = new URL(`file://${entry}`).href;
    return entryUrl === import.meta.url;
  } catch {
    return false;
  }
})();

if (directRun) {
  main().catch((e) => {
    console.error("[mining:runner] fatal:", e);
    process.exit(1);
  });
}
