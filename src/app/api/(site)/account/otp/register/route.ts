// app/api/account/otp/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as OTPAuth from "otpauth";
import { prisma } from "@/lib/prisma";
import type { OtpRegisterResponse } from "@/types/account";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      email?: unknown;
      code?: unknown;
    } | null;

    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body?.code === "string" ? body.code : "";

    if (!email || !/^\d{6}$/.test(code)) {
      const resp: OtpRegisterResponse = {
        ok: false,
        code: "INVALID_INPUT",
        message: "Please provide a valid email and 6-digit code.",
      };
      return NextResponse.json(resp, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, googleOtpSecret: true },
    });

    const base32 = user?.googleOtpSecret ?? null;
    if (!base32) {
      const resp: OtpRegisterResponse = {
        ok: false,
        code: "NOT_PROVISIONED",
        message:
          "No OTP secret found. Please call /api/account/otp/init first.",
      };
      return NextResponse.json(resp, { status: 400 });
    }

    const secret = OTPAuth.Secret.fromBase32(
      base32.replace(/\s+/g, "").toUpperCase()
    );
    const totp = new OTPAuth.TOTP({
      issuer: "QAI",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      const resp: OtpRegisterResponse = {
        ok: false,
        code: "VERIFY_FAILED",
        message: "OTP code verification failed.",
      };
      return NextResponse.json(resp, { status: 400 });
    }

    await prisma.user.update({
      where: { email },
      data: { googleOtpEnabled: true },
    });

    const resp: OtpRegisterResponse = { ok: true };
    return NextResponse.json(resp, { status: 200 });
  } catch (e) {
    const resp: OtpRegisterResponse = {
      ok: false,
      code: "REGISTER_FAILED",
      message: e instanceof Error ? e.message : String(e),
    };
    return NextResponse.json(resp, { status: 400 });
  }
}
