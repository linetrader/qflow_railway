// src/worker/sweep/admin-wallet.ts

import { prisma } from "@/lib/prisma";
import { decryptTextAesGcm } from "@/lib/encrypt";
import { ethers, Wallet, getAddress as _getAddress } from "ethers";
import type { AdminWalletLoaded } from "./types";

export async function loadAdminWallet(
  provider: ethers.JsonRpcProvider
): Promise<AdminWalletLoaded | null> {
  let adminUserId: string | null = null;

  try {
    const kv = await prisma.systemKV.findUnique({
      where: { key: "admin_user_id" },
      select: { value: true },
    });
    if (kv?.value) adminUserId = kv.value;
  } catch {
    /* pass */
  }

  let admin = null as null | {
    userId: string;
    depositAddress: string | null;
    depositPrivCipher: string | null;
    depositPrivIv: string | null;
    depositPrivTag: string | null;
    depositKeyAlg: string | null;
    depositKeyVersion: number | null;
  };

  if (adminUserId) {
    admin = await prisma.userWallet.findUnique({
      where: { userId: adminUserId },
      select: {
        userId: true,
        depositAddress: true,
        depositPrivCipher: true,
        depositPrivIv: true,
        depositPrivTag: true,
        depositKeyAlg: true,
        depositKeyVersion: true,
      },
    });
  }

  if (!admin) {
    const u = await prisma.user.findFirst({
      where: { username: "admin" },
      select: {
        id: true,
        wallet: {
          select: {
            userId: true,
            depositAddress: true,
            depositPrivCipher: true,
            depositPrivIv: true,
            depositPrivTag: true,
            depositKeyAlg: true,
            depositKeyVersion: true,
          },
        },
      },
    });
    admin = u?.wallet ?? null;
  }

  if (!admin || !admin.depositAddress) {
    console.error("[sweep] admin wallet not found or has no depositAddress");
    return null;
  }

  const adminAddress = _getAddress(admin.depositAddress) as `0x${string}`;
  let adminSigner: Wallet | undefined = undefined;

  if (admin.depositPrivCipher && admin.depositPrivIv && admin.depositPrivTag) {
    try {
      const adminPk = decryptTextAesGcm({
        ciphertextB64: admin.depositPrivCipher,
        ivB64: admin.depositPrivIv,
        tagB64: admin.depositPrivTag,
        alg: "aes-256-gcm",
        version: Number(admin.depositKeyVersion ?? 1),
      });
      adminSigner = new Wallet(adminPk, provider);
    } catch {
      console.warn(
        "[sweep] admin private key decrypt failed; continuing without signer"
      );
    }
  }

  return { adminAddress, adminSigner };
}
