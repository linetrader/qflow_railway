// src/app/api/account/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getUserEmail } from "@/lib/request-user";
import type { PasswordChangeResponse } from "@/types/account";
import { isPasswordStrong } from "@/types/account/passwordRules";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function extractStr(x: unknown): string | null {
  return typeof x === "string" ? x : null;
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    const body = (isRecord(raw) ? raw : null) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    } | null;

    const currentPassword = extractStr(body?.currentPassword) ?? "";
    const newPassword = extractStr(body?.newPassword) ?? "";

    // 🔐 헤더에서 이메일 읽기
    const email = await getUserEmail();
    if (!email) {
      const resp: PasswordChangeResponse = {
        ok: false,
        code: "AUTH_REQUIRED",
        message: "Authentication required.",
      };
      return NextResponse.json(resp, { status: 401 });
    }

    // 입력 검증
    if (!currentPassword || !newPassword) {
      const resp: PasswordChangeResponse = {
        ok: false,
        code: "INVALID_INPUT",
        message: "Missing password fields.",
      };
      return NextResponse.json(resp, { status: 400 });
    }
    if (!isPasswordStrong(newPassword)) {
      const resp: PasswordChangeResponse = {
        ok: false,
        code: "INVALID_INPUT",
        message: "Password does not meet complexity requirements.",
      };
      return NextResponse.json(resp, { status: 400 });
    }
    if (currentPassword === newPassword) {
      const resp: PasswordChangeResponse = {
        ok: false,
        code: "INVALID_INPUT",
        message: "New password must differ from current password.",
      };
      return NextResponse.json(resp, { status: 400 });
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      const resp: PasswordChangeResponse = {
        ok: false,
        code: "USER_NOT_FOUND",
        message: "User not found.",
      };
      return NextResponse.json(resp, { status: 404 });
    }

    // 현재 비밀번호 확인
    const ok = user.passwordHash
      ? await bcrypt.compare(currentPassword, user.passwordHash)
      : false;
    if (!ok) {
      const resp: PasswordChangeResponse = {
        ok: false,
        code: "WRONG_PASSWORD",
        message: "Current password is incorrect.",
      };
      return NextResponse.json(resp, { status: 403 });
    }

    // 변경
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    const resp: PasswordChangeResponse = { ok: true };
    return NextResponse.json(resp, { status: 200 });
  } catch (e) {
    const resp: PasswordChangeResponse = {
      ok: false,
      code: "UPDATE_FAILED",
      message: e instanceof Error ? e.message : "Password update failed.",
    };
    return NextResponse.json(resp, { status: 500 });
  }
}
