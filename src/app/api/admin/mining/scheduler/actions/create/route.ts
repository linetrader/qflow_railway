// app/admin/mining/scheduler/actions/create/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { MiningScheduleKind } from "@/generated/prisma";
import { nextDailyFromNow } from "../../_utils/nextDaily"; // 경로 확인
import { redirect } from "next/navigation";

function buildDaysOfWeekMask(dows: string[] | null): number {
  if (!dows || dows.length === 0) return 127;
  let mask = 0;
  for (const s of dows) {
    const d = Number(s);
    if (Number.isInteger(d) && d >= 0 && d <= 6) mask |= 1 << d;
  }
  return mask || 127;
}

export async function POST(req: Request) {
  const form = await req.formData();

  const rawName = (form.get("name") as string | null)?.trim() ?? "";
  const name =
    rawName.length > 0 ? rawName : `스케줄-${new Date().toISOString()}`;

  const policyId = form.get("policyId") as string | null;
  const isActive = form.get("isActive") === "on";
  const kind = ((form.get("kind") as string) ||
    "INTERVAL") as MiningScheduleKind;

  const intervalMinutes = Number(form.get("intervalMinutes") || 0) || null;

  const dailyAtMinutes = Number(form.get("dailyAtMinutes") || 0) || null;
  const timezone = (form.get("timezone") as string) || "Asia/Seoul";
  const dows = form.getAll("dow")?.map(String) ?? null;
  const daysOfWeekMask = buildDaysOfWeekMask(dows);

  if (!policyId) {
    return NextResponse.json({ error: "policyId required" }, { status: 400 });
  }

  const nextRunAt =
    kind === "DAILY"
      ? nextDailyFromNow(dailyAtMinutes ?? 0, timezone, daysOfWeekMask)
      : new Date(); // INTERVAL은 즉시

  await prisma.miningSchedule.create({
    data: {
      name,
      policyId,
      isActive,
      kind,
      intervalMinutes: kind === "INTERVAL" ? intervalMinutes : null,
      dailyAtMinutes: kind === "DAILY" ? dailyAtMinutes : null,
      timezone: kind === "DAILY" ? timezone : null,
      daysOfWeekMask: kind === "DAILY" ? daysOfWeekMask : null,
      nextRunAt,
    },
    select: { id: true },
  });

  revalidatePath("/admin/mining/scheduler");

  // 배포 환경에서도 현재 오리진 기준으로 안전하게 이동 (PRG)
  redirect("/admin/mining/scheduler");
}
