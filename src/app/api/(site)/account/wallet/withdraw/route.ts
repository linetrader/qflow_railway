// app/api/account/wallet/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as OTPAuth from "otpauth";
import { getUserId } from "@/lib/request-user";
import type {
  WalletWithdrawGetResponse,
  UpdateWalletResponse,
} from "@/types/account";

function isValidEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      const body: WalletWithdrawGetResponse = {
        ok: false,
        code: "AUTH_REQUIRED",
      };
      return NextResponse.json(body, { status: 401 });
    }

    const w = await prisma.userWallet.findUnique({
      where: { userId },
      select: { withdrawAddress: true },
    });

    const body: WalletWithdrawGetResponse = {
      ok: true,
      wallet: { withdrawAddress: w?.withdrawAddress ?? null },
    };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const body: WalletWithdrawGetResponse = {
      ok: false,
      code: "UNKNOWN",
      message: e instanceof Error ? e.message : String(e),
    };
    return NextResponse.json(body, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      const body: UpdateWalletResponse = { ok: false, code: "AUTH_REQUIRED" };
      return NextResponse.json(body, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      address?: unknown;
      otpCode?: unknown;
    } | null;

    const addr = typeof body?.address === "string" ? body.address.trim() : "";
    const otpCodeRaw = typeof body?.otpCode === "string" ? body.otpCode : "";
    const otpCode = otpCodeRaw.replace(/\D/g, "").slice(0, 6);

    if (!isValidEvmAddress(addr)) {
      const resp: UpdateWalletResponse = {
        ok: false,
        code: "INVALID_ADDRESS",
        message: "Invalid EVM address.",
      };
      return NextResponse.json(resp, { status: 400 });
    }
    if (!/^\d{6}$/.test(otpCode)) {
      const resp: UpdateWalletResponse = {
        ok: false,
        code: "INVALID_OTP",
        message: "Please provide a 6-digit OTP code.",
      };
      return NextResponse.json(resp, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, googleOtpEnabled: true, googleOtpSecret: true },
    });
    if (!user) {
      const resp: UpdateWalletResponse = { ok: false, code: "USER_NOT_FOUND" };
      return NextResponse.json(resp, { status: 404 });
    }
    if (!user.googleOtpEnabled) {
      const resp: UpdateWalletResponse = {
        ok: false,
        code: "OTP_REQUIRED",
        message: "OTP is not enabled.",
      };
      return NextResponse.json(resp, { status: 400 });
    }
    if (!user.googleOtpSecret) {
      const resp: UpdateWalletResponse = {
        ok: false,
        code: "NOT_PROVISIONED",
        message: "No OTP secret found.",
      };
      return NextResponse.json(resp, { status: 400 });
    }

    const secretB32 = user.googleOtpSecret.replace(/\s+/g, "").toUpperCase();
    const secret = OTPAuth.Secret.fromBase32(secretB32);
    const totp = new OTPAuth.TOTP({
      issuer: "QAI",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    const delta = totp.validate({ token: otpCode, window: 2 });
    if (delta === null) {
      const resp: UpdateWalletResponse = {
        ok: false,
        code: "OTP_VERIFY_FAILED",
        message: "OTP verification failed.",
      };
      return NextResponse.json(resp, { status: 400 });
    }

    const saved = await prisma.userWallet.upsert({
      where: { userId },
      update: { withdrawAddress: addr },
      create: { userId, withdrawAddress: addr },
      select: { withdrawAddress: true },
    });

    const resp: UpdateWalletResponse = {
      ok: true,
      wallet: { withdrawAddress: saved.withdrawAddress ?? addr },
    };
    return NextResponse.json(resp, { status: 200 });
  } catch (e) {
    const resp: UpdateWalletResponse = {
      ok: false,
      code: "SAVE_FAILED",
      message: e instanceof Error ? e.message : String(e),
    };
    return NextResponse.json(resp, { status: 400 });
  }
}
