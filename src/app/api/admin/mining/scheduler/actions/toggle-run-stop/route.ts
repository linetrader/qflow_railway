// app/api/mining/scheduler/toggle-run-stop/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { nextDailyFromNow } from "../../_utils/nextDaily"; // 경로 확인
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = (form.get("id") as string | null)?.trim() ?? "";
  const currentlyActive = String(form.get("currentlyActive") || "") === "true";

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const s = await prisma.miningSchedule.findUnique({ where: { id } });
  if (!s) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (currentlyActive) {
    await prisma.miningSchedule.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    const nextRunAt =
      s.kind === "DAILY"
        ? nextDailyFromNow(
            s.dailyAtMinutes ?? 0,
            s.timezone ?? "Asia/Seoul",
            s.daysOfWeekMask ?? 127
          )
        : new Date();

    await prisma.miningSchedule.update({
      where: { id },
      data: { isActive: true, nextRunAt },
    });
  }

  revalidatePath("/admin/mining/scheduler");
  redirect("/admin/mining/scheduler"); // 상대 경로 리다이렉트 (PRG)
}
