// src/app/api/(site)/auth/resolve-user/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const usernameCandidate = q.toLowerCase();
  const referralCandidate = q.toUpperCase();

  const found =
    (await prisma.user.findUnique({
      where: { username: usernameCandidate },
      select: { id: true, username: true, referralCode: true },
    })) ||
    (await prisma.user.findUnique({
      where: { referralCode: referralCandidate },
      select: { id: true, username: true, referralCode: true },
    }));

  if (!found) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, user: found }, { status: 200 });
}
