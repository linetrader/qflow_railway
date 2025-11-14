// app/admin/mining/scheduler/actions/delete/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = form.get("id") as string | null;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.miningSchedule.delete({ where: { id } });

  // 목록 캐시 무효화
  revalidatePath("/admin/mining/scheduler");

  // 배포 환경에서도 현재 오리진 기준으로 안전하게 이동
  redirect("/admin/mining/scheduler");
}
