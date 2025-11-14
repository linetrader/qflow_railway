// src/worker/level-recalc/workers/worker.ts
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { recalcLevelForUser, getParentId } from "../recalc";
import { loadWorkerConfig, type LoadedWorkerConfig } from "./config-db";
import { distributeLevelBonusForPurchaseUSDT } from "../level-bonus-purchase";

/** 실행 시점 캐시된 설정 */
let CFG: LoadedWorkerConfig | null = null;
async function getCfg(): Promise<LoadedWorkerConfig> {
  if (!CFG) CFG = await loadWorkerConfig();
  return CFG;
}

type PickedJobRow = {
  id: number;
  userId: string;
  payload: unknown;
  pickedAt: Date;
};

function visibilityTimeoutSec(cfg: LoadedWorkerConfig): number {
  return Math.max(1, Math.floor(cfg.stallMs / 1000));
}
function maxJobWalltimeSec(cfg: LoadedWorkerConfig): number {
  return Math.max(visibilityTimeoutSec(cfg), Math.floor(cfg.maxAgeMs / 1000));
}

/** 만료된/고아 IN_PROGRESS → PENDING 복구 */
async function rescueOrphans(rescueGraceSec: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "LevelRecalcJob"
    SET "status"='PENDING',
        "availableUntil"=NULL,
        "pickedAt"=NULL,
        "pickedBy"=NULL,
        "updatedAt"=now(),
        "scheduledAt"=now()
    WHERE "status"='IN_PROGRESS'
      AND (
        ("availableUntil" < now())
        OR ("availableUntil" IS NULL AND "pickedAt" IS NOT NULL AND "pickedAt" < now() - make_interval(secs => ${rescueGraceSec}))
      )
  `;
}

/** 하트비트: availableUntil 연장(벽시한 상한 적용) */
async function extendLease(
  jobId: number,
  visSec: number,
  maxSec: number
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "LevelRecalcJob"
    SET "availableUntil" = LEAST(
          "pickedAt" + make_interval(secs => ${maxSec}),
          now() + make_interval(secs => ${visSec})
        ),
        "updatedAt" = now()
    WHERE id = ${jobId} AND "status"='IN_PROGRESS'
  `;
}

/** 벽시한 초과 시 상태 전환 */
async function exceedLease(
  jobId: number,
  mode: "DEAD" | "PENDING" = "DEAD"
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "LevelRecalcJob"
    SET "status" = ${mode},
        "availableUntil" = NULL,
        "updatedAt" = now(),
        "finishedAt" = CASE WHEN ${mode}='DEAD' THEN now() ELSE "finishedAt" END,
        "lastError" = COALESCE("lastError",'') || ' | lease expired at ' || now()
    WHERE id = ${jobId} AND "status"='IN_PROGRESS'
  `;
}

async function isLeaseExpired(jobId: number, maxSec: number): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ expired: boolean }>>`
    SELECT now() > ("pickedAt" + make_interval(secs => ${maxSec})) AS expired
    FROM "LevelRecalcJob" WHERE id=${jobId}
  `;
  if (!rows.length) return false;
  return Boolean(rows[0]?.expired);
}

/** 사용자 단위 advisory lock */
async function lockUser(userId: string): Promise<boolean> {
  const r = await prisma.$queryRaw<Array<{ ok: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${userId})) AS ok
  `;
  return Boolean(r[0]?.ok);
}
async function unlockUser(userId: string): Promise<void> {
  await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${userId}))`;
}

/** 픽: PENDING 중에서 가져오기 (전역 사용자 중복 차단 + 배치 내 dedup + stopAtUserId 제외) */
async function pickJobs(
  workerId: string,
  fetchLimit: number,
  visSec: number,
  stopAtUserId: string | null
): Promise<PickedJobRow[]> {
  const sql = `
    WITH cand AS (
      SELECT j.id, j."userId", j."scheduledAt"
      FROM "LevelRecalcJob" j
      WHERE j."status" = 'PENDING'
        AND j."scheduledAt" <= now()
        AND (j."availableUntil" IS NULL OR j."availableUntil" <= now())
        AND NOT EXISTS (
          SELECT 1 FROM "LevelRecalcJob" x
          WHERE x."userId" = j."userId" AND x."status" = 'IN_PROGRESS'
        )
        AND ($4 IS NULL OR j."userId" <> $4)
      FOR UPDATE SKIP LOCKED
    ),
    dedup AS (
      SELECT id
      FROM (
        SELECT id, "userId", "scheduledAt",
               ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "scheduledAt", id) AS rn
        FROM cand
      ) s
      WHERE rn = 1
      ORDER BY "scheduledAt", id
      LIMIT $1
    )
    UPDATE "LevelRecalcJob" j
    SET "status" = 'IN_PROGRESS',
        "pickedAt" = now(),
        "pickedBy" = $2,
        "availableUntil" = now() + make_interval(secs => $3),
        "updatedAt" = now()
    FROM dedup
    WHERE j.id = dedup.id
    RETURNING j.id, j."userId", j.payload, j."pickedAt";
  `;
  return prisma.$queryRawUnsafe<PickedJobRow[]>(
    sql,
    fetchLimit,
    workerId,
    visSec,
    stopAtUserId
  );
}

async function succeed(id: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "LevelRecalcJob"
    SET "status"='SUCCEEDED', "finishedAt"=now(), "updatedAt"=now()
    WHERE id=${id}
  `;
}

async function retryOrDead(id: number, err: string): Promise<void> {
  const sql = `
    UPDATE "LevelRecalcJob"
    SET "attempts" = "attempts" + 1,
        "status" = CASE WHEN "attempts" + 1 >= "maxAttempts" THEN 'DEAD' ELSE 'PENDING' END,
        "scheduledAt" = CASE
          WHEN "attempts" + 1 >= "maxAttempts" THEN "scheduledAt"
          ELSE now() + (interval '5 seconds' * power(2, LEAST("attempts", 6)))
        END,
        "availableUntil" = NULL,
        "lastError" = $2,
        "updatedAt" = now()
    WHERE id = $1
  `;
  await prisma.$queryRawUnsafe(sql, id, err);
}

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/** 레벨 보너스 지급용 잡 페이로드 스키마 */
type RecalcJobPayload = {
  purchaseAmountUSD?: string | number;
  historyIds?: string[]; // 단건이면 1개, 다건이면 N개
} | null;

function parsePayload(p: unknown): RecalcJobPayload {
  if (p === null || p === undefined) return null;
  if (typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const v1 = o["purchaseAmountUSD"];
  const v2 = o["historyIds"];
  const out: RecalcJobPayload = {};
  if (typeof v1 === "string" || typeof v1 === "number") {
    out.purchaseAmountUSD = v1;
  }
  if (Array.isArray(v2) && v2.every((x) => typeof x === "string")) {
    out.historyIds = v2 as string[];
  }
  return out;
}

/**
 * stopAtUserId 제외 및 상향 전파 제한, 재산정 + (구매금액 기반 레벨 보너스 USDT 지급) + 부모 전파
 */
export async function workerOnce(workerId: string): Promise<void> {
  const cfg = await getCfg();
  const VIS_SEC = visibilityTimeoutSec(cfg);
  const MAX_SEC = maxJobWalltimeSec(cfg);

  await rescueOrphans(cfg.rescueGraceSec);

  const jobs = await pickJobs(
    workerId,
    cfg.fetchLimit,
    VIS_SEC,
    cfg.stopAtUserId
  );
  console.log(`[worker] picked ${jobs.length} job(s)`);

  const seen = new Set<string>();

  for (const job of jobs) {
    if (seen.has(job.userId)) {
      await prisma.$executeRaw`
        UPDATE "LevelRecalcJob"
        SET "status"='PENDING',
            "availableUntil"=NULL,
            "pickedAt"=NULL,
            "pickedBy"=NULL,
            "updatedAt"=now(),
            "scheduledAt"=now()
        WHERE id=${job.id} AND "status"='IN_PROGRESS'
      `;
      continue;
    }
    seen.add(job.userId);

    if (cfg.stopAtUserId && job.userId === cfg.stopAtUserId) {
      console.debug?.(
        `[worker] skip job=${job.id} (stopAtUserId=${cfg.stopAtUserId})`
      );
      await succeed(job.id);
      continue;
    }

    try {
      console.debug?.(`[worker] start job=${job.id} user=${job.userId}`);

      const got = await lockUser(job.userId);
      if (!got) {
        console.warn?.(
          `[worker] skip job=${job.id} user=${job.userId} (advisory lock busy)`
        );
        await retryOrDead(job.id, "advisory_lock_busy");
        continue;
      }

      try {
        let uid: string | null = job.userId;

        const payload = parsePayload(job.payload);
        const purchaseUSD =
          payload?.purchaseAmountUSD != null
            ? new Decimal(payload.purchaseAmountUSD.toString())
            : null;
        const historyIds: string[] = Array.isArray(payload?.historyIds)
          ? (payload!.historyIds as string[])
          : [];

        if (process.env.LEVEL_BONUS_DEBUG) {
          console.debug?.("[worker] parsed payload", {
            jobId: BigInt(job.id),
            userId: job.userId,
            purchaseAmountUSD_raw: payload?.purchaseAmountUSD ?? null,
            purchaseAmountUSD_decimal: purchaseUSD?.toString() ?? null,
            historyIds,
          });
        }

        let levelBonusDone = false;

        for (let step = 0; step < cfg.maxChainDepth && uid; step++) {
          if (cfg.stopAtUserId && uid === cfg.stopAtUserId) {
            console.debug?.(
              `[worker] stopAtUserId encountered at user=${uid} -> stop upward propagation`
            );
            break;
          }

          if (await isLeaseExpired(job.id, MAX_SEC)) {
            await exceedLease(job.id, "DEAD");
            throw new Error(cfg.leaseExpiredError);
          }

          await prisma.$transaction(async (tx) => {
            await recalcLevelForUser(tx, uid!);
          });

          // 소스 사용자 1회 지급
          if (
            !levelBonusDone &&
            uid === job.userId &&
            purchaseUSD &&
            purchaseUSD.gt(0)
          ) {
            const sourceHistoryId =
              historyIds.length === 1 ? historyIds[0] : `agg:${job.id}`; // 다건일 때 집계 키

            await prisma.$transaction(async (tx) => {
              const src = await tx.user.findUnique({
                where: { id: uid! },
                select: { level: true },
              });
              const sourceLevel = src?.level ?? 0;

              await distributeLevelBonusForPurchaseUSDT({
                tx,
                sourceUserId: uid!,
                sourceLevel,
                amountUSD: purchaseUSD,
                sourceHistoryId,
                minEligibleLevel: 1,
                runLabel: `LEVEL BONUS (purchaseUSD) [job=${job.id}]`,
              });
            });
            levelBonusDone = true;
          }

          const nextParent = await prisma.$transaction((tx) =>
            getParentId(tx, uid!)
          );

          if (
            cfg.stopAtUserId &&
            nextParent &&
            nextParent === cfg.stopAtUserId
          ) {
            console.debug?.(
              `[worker] next parent=${nextParent} is stopAtUserId -> stop before processing parent`
            );
            break;
          }

          uid = nextParent;

          if ((step + 1) % cfg.heartbeatEverySteps === 0) {
            await extendLease(job.id, VIS_SEC, MAX_SEC);
          }
        }

        await succeed(job.id);
        console.debug?.(`[worker] done job=${job.id}`);
      } finally {
        await unlockUser(job.userId);
      }
    } catch (e: unknown) {
      const msg = toErrorMessage(e);
      if (msg === cfg.leaseExpiredError) {
        console.warn?.(`[worker] job ${job.id} lease expired → marked DEAD`);
        continue;
      }
      console.error?.(`[worker] fail job=${job.id}:`, msg);
      await retryOrDead(job.id, msg);
    }
  }
}
