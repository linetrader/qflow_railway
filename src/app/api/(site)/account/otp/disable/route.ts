// src/app/api/(site)/account/otp/disable/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";
import type { OtpDisableResponse } from "@/types/account";

export const runtime = "nodejs";

export async function POST() {
  try {
    const userId = await getUserId();
    if (!userId) {
      // OtpSimpleErrCode에는 "AUTH_REQUIRED"가 정의되어 있습니다.
      const body: OtpDisableResponse = { ok: false, code: "AUTH_REQUIRED" };
      return NextResponse.json(body, { status: 401 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { googleOtpEnabled: false, googleOtpSecret: null },
    });

    const body: OtpDisableResponse = { ok: true };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    // disable 실패 계열 코드는 "REGISTER_FAILED"를 재사용합니다.
    const body: OtpDisableResponse = {
      ok: false,
      code: "REGISTER_FAILED",
      message: e instanceof Error ? e.message : String(e),
    };
    return NextResponse.json(body, { status: 500 });
  }
}
