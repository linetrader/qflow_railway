// app/api/account/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";
import type { AccountGetResponse } from "@/types/account";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      const body: AccountGetResponse = { ok: false, code: "AUTH_REQUIRED" };
      return NextResponse.json(body, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        email: true,
        name: true,
        referralCode: true,
        googleOtpEnabled: true,
        country: { select: { code: true, name: true } },
        wallet: { select: { withdrawAddress: true } },
      },
    });

    if (!user) {
      const body: AccountGetResponse = { ok: false, code: "NOT_FOUND" };
      return NextResponse.json(body, { status: 404 });
    }

    const body: AccountGetResponse = {
      ok: true,
      profile: {
        username: user.username,
        email: user.email,
        name: user.name,
        referralCode: user.referralCode,
        googleOtpEnabled: user.googleOtpEnabled,
        country: user.country
          ? { code: user.country.code, name: user.country.name }
          : null,
        wallet: { withdrawAddress: user.wallet?.withdrawAddress ?? null },
      },
    };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const body: AccountGetResponse = {
      ok: false,
      code: "UNKNOWN",
      message: e instanceof Error ? e.message : String(e),
    };
    return NextResponse.json(body, { status: 500 });
  }
}
