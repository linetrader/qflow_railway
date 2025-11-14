import { prisma } from "@/lib/prisma";

/** 런타임에서 워커가 참조할 최종 설정 타입 */
export type LoadedWorkerConfig = {
  /** 운영 스위치 */
  isActive: boolean;
  mode: "once" | "loop";
  workerId: string;

  /** 주기/버스트 */
  intervalMs: number;
  burstRuns: number;

  /** 배치 */
  batchSize: number;
  fetchLimit: number;

  /** 리스/수명 */
  stallMs: number;
  maxAgeMs: number;

  /** 로그 */
  logLevel: "debug" | "info" | "warn" | "error";

  /** ▼ DB로부터도 로드되는 런타임 상수들 */
  maxChainDepth: number; // MAX_CHAIN_DEPTH
  heartbeatEverySteps: number; // HEARTBEAT_EVERY_STEPS
  rescueGraceSec: number; // RESCUE_GRACE_SEC
  leaseExpiredError: string; // LEASE_EXPIRED_ERROR

  /** 만나면 상향 전파 중단할 사용자 ID (null이면 비활성) */
  stopAtUserId: string | null;
};

/** DB select 로우 타입 */
type LevelWorkerConfigRow = {
  isActive: boolean | null;
  mode: string | null;
  workerId: string | null;

  intervalMs: number | null;
  burstRuns: number | null;

  batchSize: number | null;
  fetchLimit: number | null;

  stallMs: number | null;
  maxAgeMs: number | null;

  logLevel: string | null;

  maxChainDepth: number | null;
  heartbeatEverySteps: number | null;
  rescueGraceSec: number | null;
  leaseExpiredError: string | null;

  stopAtUserId: string | null;
};

/** 기본값(고정 상수) */
const DEFAULTS: Omit<LoadedWorkerConfig, "workerId"> & {
  workerIdFallback: string;
} = {
  isActive: false, // 안전 기본값
  mode: "once",
  workerIdFallback: `level-worker:${
    typeof process !== "undefined" ? process.pid : "0"
  }`,
  intervalMs: 3000,
  burstRuns: 1,

  batchSize: 10,
  fetchLimit: 50,

  stallMs: 60_000, // 60s
  maxAgeMs: 86_400_000, // 24h

  logLevel: "info",

  // ▼ 워커 런타임 상수 기본값
  maxChainDepth: 200,
  heartbeatEverySteps: 10,
  rescueGraceSec: 300,
  leaseExpiredError: "lease_expired",

  // 특정 아이디를 만나면 중단 (기본 admin)
  stopAtUserId: "admin",
};

/** 숫자형 안전 파싱 */
function toFiniteNumber(v: unknown, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/** 문자열 → 모드 안전 변환 */
function coerceMode(
  v: string | null | undefined,
  def: LoadedWorkerConfig["mode"]
): LoadedWorkerConfig["mode"] {
  return v === "once" || v === "loop" ? v : def;
}

/** 문자열 → 로그레벨 안전 변환 */
function coerceLogLevel(
  v: string | null | undefined,
  def: LoadedWorkerConfig["logLevel"]
): LoadedWorkerConfig["logLevel"] {
  if (v === "debug" || v === "info" || v === "warn" || v === "error") return v;
  return def;
}

/**
 * 기본 설정 생성 (.env 미사용)
 * - 필수: workerId (미지정 시 내부 fallback 사용)
 * - 선택: 일부 값 override
 */
export function defaultWorkerConfig(
  overrides?: Partial<Omit<LoadedWorkerConfig, "workerId">> & {
    workerId?: string;
  }
): LoadedWorkerConfig {
  const workerId = overrides?.workerId ?? DEFAULTS.workerIdFallback;
  return {
    isActive: overrides?.isActive ?? DEFAULTS.isActive,
    mode: overrides?.mode ?? DEFAULTS.mode,
    workerId,

    intervalMs: toFiniteNumber(overrides?.intervalMs, DEFAULTS.intervalMs),
    burstRuns: toFiniteNumber(overrides?.burstRuns, DEFAULTS.burstRuns),

    batchSize: toFiniteNumber(overrides?.batchSize, DEFAULTS.batchSize),
    fetchLimit: toFiniteNumber(overrides?.fetchLimit, DEFAULTS.fetchLimit),

    stallMs: toFiniteNumber(overrides?.stallMs, DEFAULTS.stallMs),
    maxAgeMs: toFiniteNumber(overrides?.maxAgeMs, DEFAULTS.maxAgeMs),

    logLevel: overrides?.logLevel ?? DEFAULTS.logLevel,

    // ▼ 런타임 상수
    maxChainDepth: toFiniteNumber(
      overrides?.maxChainDepth,
      DEFAULTS.maxChainDepth
    ),
    heartbeatEverySteps: toFiniteNumber(
      overrides?.heartbeatEverySteps,
      DEFAULTS.heartbeatEverySteps
    ),
    rescueGraceSec: toFiniteNumber(
      overrides?.rescueGraceSec,
      DEFAULTS.rescueGraceSec
    ),
    leaseExpiredError:
      overrides?.leaseExpiredError ?? DEFAULTS.leaseExpiredError,

    stopAtUserId: overrides?.stopAtUserId ?? DEFAULTS.stopAtUserId,
  };
}

/**
 * DB에서 최신 설정을 읽어와 기본값 위에 덮어씀 (.env 미사용)
 * - 기본 테이블: "LevelWorkerConfig"
 * - 우선 key='default' 단일행 조회 → 없으면 isActive=true 최신 1건 조회
 * - 모두 실패 시 기본값/override만 반환
 */
export async function loadWorkerConfig(opts?: {
  tableName?: string; // 기본: LevelWorkerConfig
  overrides?: Partial<Omit<LoadedWorkerConfig, "workerId">> & {
    workerId?: string;
  };
}): Promise<LoadedWorkerConfig> {
  const table = opts?.tableName ?? "LevelWorkerConfig";
  const base = defaultWorkerConfig(opts?.overrides);

  const selectClause = `
    "isActive",
    mode,
    "workerId",
    "intervalMs",
    "burstRuns",
    "batchSize",
    "fetchLimit",
    "stallMs",
    "maxAgeMs",
    "logLevel",
    "maxChainDepth",
    "heartbeatEverySteps",
    "rescueGraceSec",
    "leaseExpiredError",
    "stopAtUserId"
  `;

  // 1) key='default' 우선
  const sqlDefault = `
    SELECT ${selectClause}
    FROM "${table}"
    WHERE key = 'default'
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `;

  // 2) 없으면 isActive=true 중 최신 1건
  const sqlActive = `
    SELECT ${selectClause}
    FROM "${table}"
    WHERE "isActive" = true
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `;

  try {
    let rows = await prisma.$queryRawUnsafe<LevelWorkerConfigRow[]>(sqlDefault);
    if (!rows || rows.length === 0) {
      rows = await prisma.$queryRawUnsafe<LevelWorkerConfigRow[]>(sqlActive);
    }
    if (!rows || rows.length === 0) return base;

    const row = rows[0];

    const merged: LoadedWorkerConfig = {
      ...base,

      // 운영 스위치
      isActive: Boolean(row.isActive ?? base.isActive),
      mode: coerceMode(row.mode, base.mode),
      // workerId는 실행 인스턴스 식별. DB값이 있으면 사용
      workerId: (row.workerId ?? base.workerId) as string,

      // 주기/버스트
      intervalMs: toFiniteNumber(row.intervalMs, base.intervalMs),
      burstRuns: toFiniteNumber(row.burstRuns, base.burstRuns),

      // 배치
      batchSize: toFiniteNumber(row.batchSize, base.batchSize),
      fetchLimit: toFiniteNumber(row.fetchLimit, base.fetchLimit),

      // 리스/수명
      stallMs: toFiniteNumber(row.stallMs, base.stallMs),
      maxAgeMs: toFiniteNumber(row.maxAgeMs, base.maxAgeMs),

      // 로그
      logLevel: coerceLogLevel(row.logLevel, base.logLevel),

      // ▼ 런타임 상수
      maxChainDepth: toFiniteNumber(row.maxChainDepth, base.maxChainDepth),
      heartbeatEverySteps: toFiniteNumber(
        row.heartbeatEverySteps,
        base.heartbeatEverySteps
      ),
      rescueGraceSec: toFiniteNumber(row.rescueGraceSec, base.rescueGraceSec),
      leaseExpiredError: (row.leaseExpiredError ??
        base.leaseExpiredError) as string,

      stopAtUserId: (row.stopAtUserId ?? base.stopAtUserId) as string | null,
    };

    return merged;
  } catch {
    return base;
  }
}
