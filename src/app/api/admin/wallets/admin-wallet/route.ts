// src/app/api/admin/wallets/admin-wallet/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  JsonRpcProvider,
  Wallet,
  isAddress,
  getAddress,
  parseUnits,
  formatUnits,
  Contract,
} from "ethers";
import { decryptTextAesGcm } from "@/lib/encrypt";
import { loadActiveChainConfig } from "@/worker/sweep/chain-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ----------------------------------------------------------------
 *  Utilities
 *  ---------------------------------------------------------------- */
function withTimeout<T>(p: Promise<T>, ms: number, label?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(
      () =>
        reject(
          new Error(
            label ? `RPC_TIMEOUT_${ms}ms:${label}` : `RPC_TIMEOUT_${ms}ms`
          )
        ),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

/** Simple provider cache to avoid new handshake on every request */
const providerCache = new Map<string, JsonRpcProvider>();
function getProvider(rpcUrl: string): JsonRpcProvider {
  const cached = providerCache.get(rpcUrl);
  if (cached) return cached;
  const p = new JsonRpcProvider(rpcUrl);
  providerCache.set(rpcUrl, p);
  return p;
}

const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
] as const;

/** -------- DB에서 어드민 서명자 확보(복호화) -------- */
async function getAdminSigner(rpcUrl: string): Promise<{
  signer: Wallet;
  provider: JsonRpcProvider;
  address: `0x${string}`;
}> {
  const adminUser = await prisma.user.findUnique({
    where: { username: "admin" },
    select: { id: true },
  });
  if (!adminUser) throw new Error(`admin user not found`);

  const uw = await prisma.userWallet.findUnique({
    where: { userId: adminUser.id },
    select: {
      depositAddress: true,
      depositPrivCipher: true,
      depositPrivIv: true,
      depositPrivTag: true,
      depositKeyVersion: true,
      depositKeyAlg: true,
    },
  });
  if (
    !uw ||
    !uw.depositPrivCipher ||
    !uw.depositPrivIv ||
    !uw.depositPrivTag ||
    !uw.depositKeyVersion
  ) {
    throw new Error("admin wallet key not provisioned in DB");
  }

  // alg literal 고정 (서버 구현 상 aes-256-gcm만 허용)
  const pk = decryptTextAesGcm({
    ciphertextB64: uw.depositPrivCipher,
    ivB64: uw.depositPrivIv,
    tagB64: uw.depositPrivTag,
    alg: "aes-256-gcm" as const,
    version: Number(uw.depositKeyVersion || 1),
  });

  const provider = getProvider(rpcUrl);
  const signer = new Wallet(pk, provider);
  const address = signer.address as `0x${string}`;

  // depositAddress 보정(최초 1회)
  if (!uw.depositAddress) {
    await prisma.userWallet.update({
      where: { userId: adminUser.id },
      data: { depositAddress: address },
    });
  }

  return { signer, provider, address };
}

/** ===================== GET: 잔고 조회 ===================== */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const chainIdOverride = url.searchParams.get("chainId") || undefined;

    const chainCfg = await loadActiveChainConfig(); // dftAddress(optional) 포함
    const chainId = chainIdOverride ?? chainCfg.id;
    if (chainId !== chainCfg.id) {
      throw new Error(`Only active chain is allowed: ${chainCfg.id}`);
    }

    const { provider, address } = await getAdminSigner(chainCfg.rpcUrl);

    // (0) Provider 웜업 – 실패 무시
    await withTimeout(provider.getBlockNumber(), 1500, "warmup").catch(
      () => {}
    );

    // (1) BNB 잔고 (2s 제한, 실패 시 0)
    const bnbRaw =
      (await withTimeout(
        provider.getBalance(address),
        2000,
        "getBalance(BNB)"
      ).catch(() => 0n)) ?? 0n;

    // (2) USDT — 주소 유효 시 병렬 호출 + 타임아웃 + 폴백(decimals:6, balance:0)
    const usdtAddr = chainCfg.usdtAddress;
    let usdtDec = 6;
    let usdtRaw = 0n;
    if (isAddress(usdtAddr)) {
      const c = new Contract(usdtAddr, erc20Abi, provider);
      const [dec, bal] = await Promise.all([
        withTimeout(c.decimals(), 1500, "USDT.decimals").catch(() => 6),
        withTimeout(c.balanceOf(address), 2000, "USDT.balanceOf").catch(
          () => 0n
        ),
      ]);
      usdtDec = Number(dec ?? 6);
      usdtRaw = BigInt(bal ?? 0n);
    }

    // (3) DFT — 선택. 주소 없으면 null, 있으면 병렬 호출 + 타임아웃 + 폴백(decimals:18, balance:0)
    const dftAddr = chainCfg.dftAddress ?? null;
    let dftBal: {
      address: string;
      decimals: number;
      raw: string;
      formatted: string;
    } | null = null;

    if (dftAddr && isAddress(dftAddr)) {
      const c = new Contract(dftAddr, erc20Abi, provider);
      const [dec, bal] = await Promise.all([
        withTimeout(c.decimals(), 1500, "DFT.decimals").catch(() => 18),
        withTimeout(c.balanceOf(address), 2000, "DFT.balanceOf").catch(
          () => 0n
        ),
      ]);
      const d = Number(dec ?? 18);
      const b = BigInt(bal ?? 0n);
      dftBal = {
        address: dftAddr,
        decimals: d,
        raw: b.toString(),
        formatted: formatUnits(b, d),
      };
    }

    return NextResponse.json({
      ok: true,
      chain: { id: chainId, rpcUrl: chainCfg.rpcUrl },
      address,
      assets: {
        BNB: {
          address: null,
          decimals: 18,
          raw: bnbRaw.toString(),
          formatted: formatUnits(bnbRaw, 18),
        },
        USDT: {
          address: usdtAddr,
          decimals: usdtDec,
          raw: usdtRaw.toString(),
          formatted: formatUnits(usdtRaw, usdtDec),
        },
        DFT: dftBal,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, code: "UNKNOWN", message: (e as Error).message },
      { status: 500 }
    );
  }
}

/** ===================== POST: 전송 ===================== */
const PostSchema = z.object({
  to: z.string().refine((v) => isAddress(v), { message: "Invalid address" }),
  asset: z.enum(["BNB", "USDT", "DFT"]),
  amount: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const p = PostSchema.safeParse(body);
    if (!p.success) {
      return NextResponse.json(
        { ok: false, code: "INVALID_INPUT", issues: p.error.issues },
        { status: 400 }
      );
    }

    const chainCfg = await loadActiveChainConfig();
    const {
      signer,
      provider,
      address: from,
    } = await getAdminSigner(chainCfg.rpcUrl);
    const to = getAddress(p.data.to);

    if (p.data.asset === "BNB") {
      // decimals 고정 18
      const value = parseUnits(p.data.amount, 18);
      const bal =
        (await withTimeout(
          provider.getBalance(from),
          2000,
          "getBalance(BNB)"
        ).catch(() => 0n)) ?? 0n;

      if (bal < value) {
        return NextResponse.json(
          { ok: false, code: "INSUFFICIENT_FUNDS", message: "Not enough BNB" },
          { status: 400 }
        );
      }

      const tx = await withTimeout(
        signer.sendTransaction({ to, value }),
        5000,
        "sendTransaction(BNB)"
      );
      return NextResponse.json({ ok: true, txHash: tx.hash });
    }

    // 토큰 주소 결정 — AdminChainConfig 기반
    const tokenAddr =
      p.data.asset === "USDT"
        ? chainCfg.usdtAddress
        : p.data.asset === "DFT"
        ? chainCfg.dftAddress ?? null
        : null;

    if (!tokenAddr || !isAddress(tokenAddr)) {
      return NextResponse.json(
        {
          ok: false,
          code: "TOKEN_ADDR_MISSING",
          message: `${p.data.asset} address not set`,
        },
        { status: 400 }
      );
    }

    const c = new Contract(tokenAddr, erc20Abi, signer);

    // decimals은 짧은 타임아웃과 기본값으로 보호
    const decimals: number = Number(
      await withTimeout(c.decimals(), 1500, "ERC20.decimals").catch(() =>
        p.data.asset === "USDT" ? 6 : 18
      )
    );
    const amount = parseUnits(p.data.amount, decimals);

    // 가스(BNB) 잔액 확인
    const gasBal =
      (await withTimeout(
        provider.getBalance(from),
        2000,
        "getBalance(gas)"
      ).catch(() => 0n)) ?? 0n;
    if (gasBal <= 0n) {
      return NextResponse.json(
        { ok: false, code: "NO_GAS", message: "BNB balance is zero for gas" },
        { status: 400 }
      );
    }

    const tx = await withTimeout(
      c.transfer(to, amount),
      5000,
      "ERC20.transfer"
    );
    return NextResponse.json({ ok: true, txHash: tx.hash });
  } catch (e) {
    return NextResponse.json(
      { ok: false, code: "UNKNOWN", message: (e as Error).message },
      { status: 500 }
    );
  }
}
