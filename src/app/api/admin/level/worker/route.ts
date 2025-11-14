// src/app/api/admin/level/worker/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { WorkerLogLevel, WorkerMode, type Prisma } from "@/generated/prisma";

// 반환 필드 선택 (+ stopAtUserId: DB에는 UUID가 저장됨)
const SELECT = {
  id: true,
  key: true,
  isActive: true,
  mode: true,
  workerId: true,
  intervalMs: true,
  burstRuns: true,
  batchSize: true,
  fetchLimit: true,
  stallMs: true,
  maxAgeMs: true,
  logLevel: true,
  maxChainDepth: true,
  heartbeatEverySteps: true,
  rescueGraceSec: true,
  leaseExpiredError: true,
  stopAtUserId: true, // DB에는 UUID가 들어있음
  createdAt: true,
  updatedAt: true,
} as const;

type LevelWorkerConfigDTO = Prisma.LevelWorkerConfigGetPayload<{
  select: typeof SELECT;
}>;

// 클라이언트로는 username을 돌려주기 위해 반환용 타입 별도 선언
type LevelWorkerConfigDTOForClient = Omit<
  LevelWorkerConfigDTO,
  "stopAtUserId"
> & {
  /** username 또는 null */
  stopAtUserId: string | null;
};

// enum 검증 (+ stopAtUserId)
const updateSchema = z
  .object({
    key: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    mode: z.nativeEnum(WorkerMode).optional(),
    workerId: z.string().min(1).optional(),
    intervalMs: z.number().int().nonnegative().optional(),
    burstRuns: z.number().int().nonnegative().optional(),
    batchSize: z.number().int().positive().optional(),
    fetchLimit: z.number().int().positive().optional(),
    stallMs: z.number().int().nonnegative().optional(),
    maxAgeMs: z.number().int().nonnegative().optional(),
    logLevel: z.nativeEnum(WorkerLogLevel).optional(),
    maxChainDepth: z.number().int().positive().optional(),
    heartbeatEverySteps: z.number().int().positive().optional(),
    rescueGraceSec: z.number().int().nonnegative().optional(),
    leaseExpiredError: z.string().min(1).optional(),
    stopAtUserId: z.string().min(1).nullable().optional(), // 입력은 username 또는 UUID 또는 null
  })
  .strict();

function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null;
}

function isPrismaKnownRequestError(
  e: unknown
): e is Prisma.PrismaClientKnownRequestError {
  if (!isRecord(e)) return false;
  const code = (e as { code?: unknown }).code;
  return typeof code === "string";
}

function safeStringify(u: unknown): string {
  try {
    if (typeof u === "string") return u;
    return JSON.stringify(u);
  } catch {
    return Object.prototype.toString.call(u);
  }
}

function toServerError(e: unknown) {
  if (isPrismaKnownRequestError(e)) {
    const meta = isRecord((e as { meta?: unknown }).meta)
      ? (e as { meta?: unknown }).meta
      : isRecord(e) && "meta" in e
      ? (e as Record<string, unknown>).meta
      : null;

    return {
      ok: false as const,
      error: `PRISMA_${(e as { code: string }).code}`,
      meta: meta ?? null,
    };
  }
  if (e instanceof Error) {
    return { ok: false as const, error: `${e.name}: ${e.message}` };
  }
  return { ok: false as const, error: safeStringify(e) };
}

/** 공백/빈문자 → null */
function normEmptyToNull(s: string | null | undefined): string | null {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : null;
}

/** 입력값( username 또는 id )을 User.id(=UUID 문자열)로 정규화 */
async function resolveUserIdOrUsernameToId(
  key: string
): Promise<string | null> {
  const k = key.trim();
  if (k.length === 0) return null;

  // 1) id로 직접 조회
  const byId = await prisma.user.findUnique({
    where: { id: k },
    select: { id: true },
  });
  if (byId) return byId.id;

  // 2) username으로 조회
  const byUsername = await prisma.user.findUnique({
    where: { username: k },
    select: { id: true },
  });
  if (byUsername) return byUsername.id;

  return null;
}

/** DB에 저장된 stopAtUserId(UUID)를 username으로 변환 */
async function mapStopAtUserIdUuidToUsername(
  cfg: LevelWorkerConfigDTO
): Promise<LevelWorkerConfigDTOForClient> {
  if (!cfg.stopAtUserId) {
    return { ...cfg, stopAtUserId: null };
  }
  const user = await prisma.user.findUnique({
    where: { id: cfg.stopAtUserId },
    select: { username: true },
  });
  return { ...cfg, stopAtUserId: user?.username ?? null };
}

/** GET /api/admin/level/worker
 * 기본 key='default' 행을 upsert 보장 후 반환
 * 응답: stopAtUserId는 username으로 반환
 */
export async function GET() {
  try {
    const cfg = await prisma.levelWorkerConfig.upsert({
      where: { key: "default" },
      update: {},
      create: { key: "default" },
      select: SELECT,
    });

    const forClient = await mapStopAtUserIdUuidToUsername(cfg);
    return NextResponse.json<LevelWorkerConfigDTOForClient>(forClient);
  } catch (e: unknown) {
    return NextResponse.json(toServerError(e), { status: 500 });
  }
}

/** PUT /api/admin/level/worker
 * 부분 업데이트. body.key 없으면 'default' 사용
 * - 입력 stopAtUserId는 username/UUID/null 허용 (저장은 항상 User.id(UUID))
 * - 응답은 username으로 반환
 */
export async function PUT(req: Request) {
  try {
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false as const,
          error: "INVALID_INPUT",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const key = input.key ?? "default";

    // 존재 보장
    await prisma.levelWorkerConfig.upsert({
      where: { key },
      update: {},
      create: { key },
    });

    // stopAtUserId 정규화: 전달된 경우에만 처리
    let resolvedStopAtUserId: string | null | undefined = undefined;
    if ("stopAtUserId" in input) {
      if (input.stopAtUserId === null) {
        resolvedStopAtUserId = null; // 명시적 비활성
      } else {
        const normalized = normEmptyToNull(input.stopAtUserId);
        if (normalized === null) {
          resolvedStopAtUserId = null;
        } else {
          const uid = await resolveUserIdOrUsernameToId(normalized);
          if (!uid) {
            return NextResponse.json(
              {
                ok: false as const,
                error: "INVALID_STOP_AT_USER",
                message:
                  "stopAtUserId가 가리키는 사용자를 찾을 수 없습니다. username 또는 UUID를 사용하세요.",
              },
              { status: 400 }
            );
          }
          resolvedStopAtUserId = uid; // 항상 UUID 저장
        }
      }
    }

    // Prisma update data 구성
    const { key: _omit, stopAtUserId: _omitStop, ...rest } = input;
    void _omit;
    void _omitStop;

    const data: Prisma.LevelWorkerConfigUpdateInput = {
      ...rest,
      ...(resolvedStopAtUserId !== undefined
        ? { stopAtUserId: resolvedStopAtUserId }
        : {}),
    };

    const updated = await prisma.levelWorkerConfig.update({
      where: { key },
      data,
      select: SELECT,
    });

    const forClient = await mapStopAtUserIdUuidToUsername(updated);

    return NextResponse.json<{
      ok: true;
      config: LevelWorkerConfigDTOForClient;
    }>({
      ok: true,
      config: forClient,
    });
  } catch (e: unknown) {
    return NextResponse.json(toServerError(e), { status: 500 });
  }
}
