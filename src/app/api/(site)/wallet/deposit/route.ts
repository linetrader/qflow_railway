// src/app/api/wallet/deposit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";
import { Wallet as EvmWallet, getAddress } from "ethers"; // ethers v6
import { encryptTextAesGcm, type EncPayload } from "@/lib/encrypt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function isEncPayload(x: unknown): x is EncPayload {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.ciphertextB64 === "string" &&
    typeof o.ivB64 === "string" &&
    typeof o.tagB64 === "string" &&
    o.alg === "aes-256-gcm" &&
    (typeof o.version === "number" || typeof o.version === "string")
  );
}

type DepositOk = { ok: true; depositAddress: string; provisioned: boolean };
type DepositErr = {
  ok: false;
  code: "UNAUTHORIZED" | "UPSTREAM_TIMEOUT" | "UNKNOWN";
  message?: string;
};

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      const body: DepositErr = { ok: false, code: "UNAUTHORIZED" };
      return NextResponse.json(body, { status: 401 });
    }

    const w = EvmWallet.createRandom();
    const newAddress = getAddress(w.address);
    const privateKey = w.privateKey;

    let enc: EncPayload | null = null;
    try {
      const e = encryptTextAesGcm(privateKey);
      if (isEncPayload(e)) enc = e;
      else console.warn("[/api/wallet/deposit] Unexpected EncPayload shape");
    } catch (e) {
      console.warn("[/api/wallet/deposit] encryptTextAesGcm failed", {
        userId,
        err: e instanceof Error ? e.message : String(e),
      });
    }

    const row = await withTimeout(
      prisma.userWallet.upsert({
        where: { userId },
        create: {
          userId,
          depositAddress: newAddress,
          ...(enc && {
            depositPrivCipher: enc.ciphertextB64,
            depositPrivIv: enc.ivB64,
            depositPrivTag: enc.tagB64,
            depositKeyAlg: enc.alg,
            depositKeyVersion:
              typeof enc.version === "number"
                ? enc.version
                : Number(enc.version),
          }),
        },
        update: {},
        select: { depositAddress: true },
      }),
      8_000
    );

    let addr = row.depositAddress;

    if (!addr) {
      const fixed = await prisma.userWallet.update({
        where: { userId },
        data: {
          depositAddress: newAddress,
          ...(enc && {
            depositPrivCipher: enc.ciphertextB64,
            depositPrivIv: enc.ivB64,
            depositPrivTag: enc.tagB64,
            depositKeyAlg: enc.alg,
            depositKeyVersion:
              typeof enc.version === "number"
                ? enc.version
                : Number(enc.version),
          }),
        },
        select: { depositAddress: true },
      });
      addr = fixed.depositAddress;
    }

    const body: DepositOk = {
      ok: true,
      depositAddress: getAddress(addr as string),
      provisioned: true,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    if ((e as Error)?.message === "TIMEOUT") {
      const body: DepositErr = {
        ok: false,
        code: "UPSTREAM_TIMEOUT",
        message: "DB timed out",
      };
      return NextResponse.json(body, { status: 504 });
    }
    console.error("[/api/wallet/deposit] GET error", e);
    const body: DepositErr = {
      ok: false,
      code: "UNKNOWN",
      message: "Server error",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
