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

// 러너 기본 폴링 간격(10초) — 정책상 고정값, 필요시 DB 기반으로 확장 가능
const LOOP_INTERVAL_MS = 10_000;

// dayjs().day(): 0(일)~6(토)
function isAllowedDOW(mask: number, d: dayjs.Dayjs) {
  const bit = 1 << d.day();
  return (mask & bit) !== 0;
}

/**
 * 스케줄 종류(kind)에 따른 nextRunAt 계산
 * - INTERVAL: intervalMinutes 후
 * - DAILY: timezone + dailyAtMinutes + daysOfWeekMask 기반
 *   (utils/schedule.ts 와 동일한 로직을 runner쪽에도 포함)
 */
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
  const mask = args.daysOfWeekMask ?? 127; // 기본: 매일 허용

  const cur = now.tz(tz);
  const targetToday = cur
    .hour(Math.floor(mins / 60))
    .minute(mins % 60)
    .second(0)
    .millisecond(0);

  if (targetToday.isAfter(cur) && isAllowedDOW(mask, targetToday)) {
    return targetToday.toDate();
  }
  // 내일부터 허용 요일 탐색 (최대 8일)
  for (let i = 1; i <= 8; i++) {
    const cand = targetToday.add(i, "day");
    if (isAllowedDOW(mask, cand)) return cand.toDate();
  }
  // 방어적 fallback
  return targetToday.add(1, "day").toDate();
}

/**
 * 실행 대상 스케줄 수집:
 * - isActive = true
 * - nextRunAt <= now
 * - kind별로 필수 필드(intervalMinutes / dailyAtMinutes) 유효성까지 where에서 필터
 */
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

/**
 * 런 시작:
 * - miningSchedule + policy 스냅샷을 기반으로 miningRun 생성
 * - 이미 RUNNING 상태의 run 이 있는 스케줄이면 에러로 막음 (동시 실행 가드)
 * - schedule.kind 에 따라 nextRunAt 재계산해서 스케줄 업데이트
 */
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

    // 동일 스케줄에서 RUNNING 이 이미 존재하면 중복 실행 차단
    const running = await tx.miningRun.findFirst({
      where: { scheduleId, status: MiningRunStatus.RUNNING },
      select: { id: true },
    });
    if (running)
      throw new Error("A run is already in progress for this schedule");

    // 정책 스냅샷을 캡처한 MiningRun 생성
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

    // kind 에 따라 nextRunAt 재계산
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

/**
 * 하나의 run 을 실제로 실행:
 * - userPackage 기준으로 각 유저의 baseDaily (노드 수량 × 패키지 dailyDftAmount) 계산
 * - SELF, COMPANY, MLM 추천, 레벨 보너스를 순서대로 지급
 * - 마지막에 run 상태를 COMPLETED 로 마킹
 */
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

  // 현재 패키지 보유자 로드 (필요 필드만 select)
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

  /**
   * userId 별로
   * - level
   * - 각 패키지별 daily/qty 리스트
   * 로 집계한 맵
   */
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

  // ── 전 유저 공통으로 한 번만 계산하면 되는 값들 ──

  // 추천 플랜에서 레벨별 퍼센트를 합산
  const referralTotalPct = policy.mlmReferralPlan.levels.reduce(
    (acc, x) => acc.add(x.percent as unknown as Decimal),
    new Decimal(0)
  );

  // MLM 총 퍼센트 (스냅샷 값)
  const mlmTotalPct =
    (run.snapMlmPct as unknown as Decimal) ??
    new Decimal((run.snapMlmPct as unknown as number) ?? 0);

  // 레벨 보너스 cap% 맵
  const levelThresholds = buildLevelThresholds(
    policy.levelBonusPlan.items.map((x) => ({
      level: x.level,
      pct: x.percent as unknown as Decimal,
    }))
  );

  // upline 체인 캐시 (referral / level bonus 모두 공용)
  const uplineCache = new Map<string, UplineNode[]>();

  // ── 유저별 루프 ──
  for (const [userId, info] of byUser.entries()) {
    // 해당 유저의 전체 baseDaily 합산
    const baseDaily = info.items.reduce(
      (acc, x) => acc.add(x.daily),
      new Decimal(0)
    );
    if (baseDaily.lte(0)) continue;

    // 소스 유저 referral 통계(allowance) 업데이트
    await bumpReferralStatsForSource(userId, baseDaily);

    const selfAmt = baseDaily.mul(run.snapSelfPct).div(100);
    const companyAmt = baseDaily.mul(run.snapCompanyPct).div(100);

    // 레벨 보너스 퍼센트 = MLM 총퍼센트 − 추천 퍼센트 합
    let levelBonusPct = mlmTotalPct.sub(referralTotalPct);
    if (levelBonusPct.lt(0)) levelBonusPct = new Decimal(0);

    // 레벨 보너스용 고정 풀 (baseDaily × levelBonusPct)
    const levelPoolFixed = baseDaily.mul(levelBonusPct).div(100);

    const totalQty = info.items.reduce((a, b) => a + b.qty, 0);

    // SELF 지급
    await createPayout({
      runId: run.id,
      sourceUserId: userId,
      beneficiaryUserId: userId,
      amountDFT: selfAmt,
      baseDailyDft: baseDaily,
      userNodeQuantity: totalQty,
      kind: MiningRewardKind.SELF,
    });

    // COMPANY 지급
    await createPayout({
      runId: run.id,
      sourceUserId: userId,
      beneficiaryUserId: policy.companyUserId,
      amountDFT: companyAmt,
      baseDailyDft: baseDaily,
      userNodeQuantity: totalQty,
      kind: MiningRewardKind.COMPANY,
    });

    // 추천 보너스: 모든 상위 포함 체인 사용
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

    // 레벨 보너스: 단조 체인 + sourceLevel 기반
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

  // run 완료 처리
  await prisma.miningRun.update({
    where: { id: run.id },
    data: { status: MiningRunStatus.COMPLETED, finishedAt: new Date() },
  });
}

/* ────────────────────────────────────────────────────────────────────
   러너 상위 API (tick / runOnce / runLoop)
   ──────────────────────────────────────────────────────────────────── */

/**
 * 한 번의 tick:
 * - collectDueSchedules(now) 로 due 스케줄 찾기
 * - 각 스케줄에 대해 startRun → executeRun 순서로 실행
 * - 동시에 여러 프로세스가 있을 수 있으므로 startRun 에서 경합 에러 발생 시 catch 후 스킵
 * @returns 실행된 run 개수
 */
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
      // 여러 프로세스가 같은 스케줄을 잡으면 "이미 RUNNING" 에러가 날 수 있음 → 경고만 찍고 무시
      console.error("[mining] schedule run error:", e);
    }
  }
  return runCount;
}

/**
 * 즉시 한 번만 tick 을 수행하는 헬퍼
 */
export async function runOnce() {
  const n = await tick(new Date());
  console.log(`[mining] runOnce: executed ${n} run(s)`);
}

// 종료 플래그
let stopping = false;

/**
 * SIGINT / SIGTERM 를 받아서 graceful stop 을 위한 플래그 세팅
 */
function installSignalHandlers() {
  const onStop = (sig: string) => {
    console.log(`[mining:runner] ${sig} received -> graceful stop`);
    stopping = true;
  };
  process.on("SIGINT", () => onStop("SIGINT"));
  process.on("SIGTERM", () => onStop("SIGTERM"));
}

/**
 * 무한 루프:
 * - intervalMs 마다 sleep 후 runOnce 호출
 * - stopping 플래그가 세트되면 루프 탈출
 * - 시작 직후에는 바로 runOnce 하지 않고 먼저 대기하여 "무조건 1회 실행" 현상 방지
 */
export async function runLoop(intervalMs = LOOP_INTERVAL_MS) {
  installSignalHandlers();
  console.log(`[mining:runner] loop start (interval=${intervalMs}ms)`);

  while (!stopping) {
    await sleep(intervalMs);
    if (stopping) break;

    try {
      await runOnce(); // due 가 없으면 아무것도 안 함
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

/**
 * CLI 인자 처리:
 * - "--once" 가 있으면 runOnce 만 실행 후 종료
 * - 없으면 runLoop 시작
 */
async function main() {
  const args = process.argv.slice(2);
  const forceOnce = args.includes("--once");
  if (forceOnce) {
    await runOnce();
    return;
  }
  await runLoop();
}

/**
 * ★ ESM 환경에서 "직접 실행" 여부를 판별하는 가드
 *
 * - process.argv[1] (엔트리 파일 경로)를 file:// URL 로 바꾼 뒤
 *   현재 모듈의 import.meta.url 과 비교
 * - 일치하면 이 파일이 엔트리 → main() 실행
 */
const directRun = (() => {
  try {
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
