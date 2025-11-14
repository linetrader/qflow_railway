// app/admin/mining/scheduler/actions/toggle-active/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = form.get("id") as string | null;
  const isActive = (form.get("isActive") as string | null) === "true";

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.miningSchedule.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin/mining/scheduler");
  redirect("/admin/mining/scheduler"); // 상대 경로 리다이렉트 (PRG)
}
