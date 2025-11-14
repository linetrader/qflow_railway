// app/api/account/otp/init/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as OTPAuth from "otpauth";
import { prisma } from "@/lib/prisma";
import type { OtpInitResponse } from "@/types/account";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function extractMessage(u: unknown): string | null {
  return isRecord(u) && typeof u.message === "string" ? u.message : null;
}
function isValidEmail(s: string): boolean {
  // 실무에선 전문 validator 사용 권장
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown = await req.json().catch(() => null);
    const body = (isRecord(bodyUnknown) ? bodyUnknown : null) as {
      email?: unknown;
      issuer?: unknown;
    } | null;

    const emailRaw =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const issuerRaw =
      typeof body?.issuer === "string" && body.issuer.trim() !== ""
        ? body.issuer.trim()
        : "QAI";

    if (!emailRaw) {
      const resp: OtpInitResponse = {
        ok: false,
        code: "INVALID_INPUT",
        message: "Email is required.",
      };
      return NextResponse.json(resp, { status: 400 });
    }
    if (!isValidEmail(emailRaw)) {
      const resp: OtpInitResponse = {
        ok: false,
        code: "INVALID_INPUT",
        message: "Invalid email format.",
      };
      return NextResponse.json(resp, { status: 400 });
    }

    // 유저 존재 확인
    const user = await prisma.user.findUnique({
      where: { email: emailRaw },
      select: { id: true, googleOtpEnabled: true },
    });

    if (!user) {
      const resp: OtpInitResponse = {
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      };
      return NextResponse.json(resp, { status: 404 });
    }

    // 이미 활성화된 경우 재발급 차단(정책에 따라 재발급 허용 시 별도 엔드포인트 권장)
    if (user.googleOtpEnabled) {
      const resp: OtpInitResponse = {
        ok: false,
        code: "ALREADY_ENABLED",
        message: "OTP is already enabled.",
      };
      return NextResponse.json(resp, { status: 409 });
    }

    // 160-bit (20 bytes) secret
    const secret = new OTPAuth.Secret({ size: 20 });

    // 저장(아직 활성화 전)
    await prisma.user.update({
      where: { email: emailRaw },
      data: {
        googleOtpSecret: secret.base32,
        googleOtpEnabled: false,
      },
    });

    // otpauth URI 생성
    // label은 보통 'email' 같은 식별자. 공백/특수문자는 인코딩되는 것이 안전.
    const totp = new OTPAuth.TOTP({
      issuer: issuerRaw,
      label: emailRaw,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    const otpauth = totp.toString(); // e.g. otpauth://totp/{issuer}:{label}?secret=...&issuer=...

    const resp: OtpInitResponse = {
      ok: true,
      secretBase32: secret.base32,
      otpauth,
    };
    return NextResponse.json(resp, { status: 200 });
  } catch (e: unknown) {
    const resp: OtpInitResponse = {
      ok: false,
      code: "INIT_FAILED",
      message: extractMessage(e) ?? "OTP initialization failed.",
    };
    // 서버 내부 예외는 500이 semantics상 더 적절
    return NextResponse.json(resp, { status: 500 });
  }
}
