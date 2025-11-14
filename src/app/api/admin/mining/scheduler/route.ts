// src/app/api/admin/mining/scheduler/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import { computeNextRunAt } from "@/worker/mining/utils/schedule";

const listSelect = {
  id: true,
  name: true,
  isActive: true,
  kind: true,
  policyId: true,
  intervalMinutes: true,
  dailyAtMinutes: true,
  timezone: true,
  daysOfWeekMask: true,
  nextRunAt: true,
  createdAt: true,
  updatedAt: true,
  policy: { select: { id: true, name: true } },
} as const;

type Row = Prisma.MiningScheduleGetPayload<{ select: typeof listSelect }>;

const createSchema = z.object({
  name: z.string().optional().nullable(),
  policyId: z.string().min(1),
  isActive: z.boolean(),
  kind: z.enum(["INTERVAL", "DAILY"]),
  intervalMinutes: z.number().int().min(1).nullable().optional(),
  dailyAtMinutes: z.number().int().min(0).max(1439).nullable().optional(),
  timezone: z.string().min(1).nullable().optional(),
  daysOfWeekMask: z.number().int().min(0).max(127).nullable().optional(),
});

const toggleSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
});

const runStopSchema = z.object({
  id: z.string().min(1),
  currentlyActive: z.boolean(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

function ok<T extends Record<string, unknown>>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}
function err(error: string, details?: unknown, status = 400) {
  return NextResponse.json({ ok: false as const, error, details }, { status });
}

export async function GET() {
  try {
    const [rows, policies] = await Promise.all([
      prisma.miningSchedule.findMany({
        orderBy: { createdAt: "desc" },
        select: listSelect,
      }),
      prisma.miningPolicy.findMany({
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true },
      }),
    ]);

    const schedules = rows.map((r: Row) => ({
      id: r.id,
      name: r.name,
      isActive: r.isActive,
      kind: r.kind,
      policyId: r.policyId,
      policyName: r.policy?.name ?? null,
      intervalMinutes: r.intervalMinutes,
      dailyAtMinutes: r.dailyAtMinutes,
      timezone: r.timezone,
      daysOfWeekMask: r.daysOfWeekMask,
      nextRunAt: r.nextRunAt ? r.nextRunAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return ok({ schedules, policies });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return err("LIST_FAILED", msg, 500);
  }
}

export async function POST(req: Request) {
  try {
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return err("INVALID_INPUT", parsed.error.flatten(), 400);
    }
    const v = parsed.data;

    // kind별 필수값 보강 검증
    if (v.kind === "INTERVAL" && !v.intervalMinutes) {
      return err(
        "INVALID_INPUT",
        { message: "intervalMinutes is required for INTERVAL" },
        400
      );
    }
    if (v.kind === "DAILY" && v.dailyAtMinutes == null) {
      return err(
        "INVALID_INPUT",
        { message: "dailyAtMinutes is required for DAILY" },
        400
      );
    }

    const name =
      v.name && v.name.trim().length > 0
        ? v.name.trim()
        : `스케줄-${new Date().toISOString()}`;

    // 생성 시점 nextRunAt 계산
    const nextRunAt = computeNextRunAt({
      kind: v.kind,
      intervalMinutes: v.kind === "INTERVAL" ? v.intervalMinutes ?? null : null,
      dailyAtMinutes: v.kind === "DAILY" ? v.dailyAtMinutes ?? null : null,
      timezone: v.kind === "DAILY" ? v.timezone ?? "Asia/Seoul" : null,
      daysOfWeekMask: v.kind === "DAILY" ? v.daysOfWeekMask ?? 127 : null,
      from: new Date(),
    });

    const created = await prisma.miningSchedule.create({
      data: {
        name,
        policyId: v.policyId,
        isActive: v.isActive,
        kind: v.kind,
        intervalMinutes:
          v.kind === "INTERVAL" ? v.intervalMinutes ?? null : null,
        dailyAtMinutes: v.kind === "DAILY" ? v.dailyAtMinutes ?? null : null,
        timezone: v.kind === "DAILY" ? v.timezone ?? "Asia/Seoul" : null,
        daysOfWeekMask: v.kind === "DAILY" ? v.daysOfWeekMask ?? 127 : null,
        nextRunAt, // ★ 생성 시 설정
      },
      select: { id: true, nextRunAt: true },
    });

    return ok(
      {
        ok: true as const,
        id: created.id,
        nextRunAt: created.nextRunAt?.toISOString() ?? null,
      },
      201
    );
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return err("CREATE_FAILED", msg, 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const raw = (await req.json().catch(() => null)) as unknown;

    // 1) 단순 토글(isActive만 변경)
    const t = toggleSchema.safeParse(raw);
    if (t.success) {
      await prisma.miningSchedule.update({
        where: { id: t.data.id },
        data: { isActive: t.data.isActive },
        select: { id: true },
      });
      return ok({ ok: true as const });
    }

    // 2) 실행/중지 토글 (현재 상태를 기반으로 반전)
    const r = runStopSchema.safeParse(raw);
    if (r.success) {
      if (r.data.currentlyActive) {
        // 현재 활성 → 비활성
        await prisma.miningSchedule.update({
          where: { id: r.data.id },
          data: { isActive: false },
          select: { id: true },
        });
      } else {
        // 현재 비활성 → 활성 + nextRunAt 재계산(정합성)
        const sched = await prisma.miningSchedule.findUnique({
          where: { id: r.data.id },
          select: {
            id: true,
            kind: true,
            intervalMinutes: true,
            dailyAtMinutes: true,
            timezone: true,
            daysOfWeekMask: true,
          },
        });
        if (!sched) {
          return err("NOT_FOUND", { id: r.data.id }, 404);
        }

        const nextRunAt = computeNextRunAt({
          kind: sched.kind,
          intervalMinutes:
            sched.kind === "INTERVAL" ? sched.intervalMinutes ?? null : null,
          dailyAtMinutes:
            sched.kind === "DAILY" ? sched.dailyAtMinutes ?? null : null,
          timezone:
            sched.kind === "DAILY" ? sched.timezone ?? "Asia/Seoul" : null,
          daysOfWeekMask:
            sched.kind === "DAILY" ? sched.daysOfWeekMask ?? 127 : null,
          from: new Date(),
        });

        await prisma.miningSchedule.update({
          where: { id: r.data.id },
          data: { isActive: true, nextRunAt },
          select: { id: true },
        });
      }
      return ok({ ok: true as const });
    }

    return err("INVALID_INPUT", { reason: "No matching patch schema" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return err("PATCH_FAILED", msg, 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = deleteSchema.safeParse(raw);
    if (!parsed.success)
      return err("INVALID_INPUT", parsed.error.flatten(), 400);

    await prisma.miningSchedule.delete({ where: { id: parsed.data.id } });
    return ok({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return err("DELETE_FAILED", msg, 500);
  }
}
