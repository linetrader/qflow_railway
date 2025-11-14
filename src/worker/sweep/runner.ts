// src/worker/sweep/runner.ts

import { prisma } from "@/lib/prisma";
import { loadActiveChainConfig } from "@/worker/sweep/chain-config";
import { ethers, Contract, getAddress as _getAddress } from "ethers";
import { ERC20_ABI } from "./abi/erc20";
import type { Erc20 } from "./types";
import { loadAdminWallet } from "./admin-wallet";
import { runBalanceOnlyPass } from "./pass/balance-only";

let running = false;
let timer: NodeJS.Timeout | null = null;

async function scanAndSweepOnce() {
  if (running) return;
  running = true;
  const started = Date.now();

  try {
    const C = await loadActiveChainConfig();
    const provider = new ethers.JsonRpcProvider(
      C.rpcUrl,
      undefined,
      { batchMaxCount: 1, batchStallTime: 0 } // batched 요청 비활성화(안전)
    );
    const usdt = new Contract(
      C.usdtAddress,
      ERC20_ABI,
      provider
    ) as unknown as Erc20;
    const BNB_MIN = ethers.parseEther(C.bnbMinForSweep);

    const admin = await loadAdminWallet(provider);
    if (!admin) {
      running = false;
      return;
    }
    const adminAddress = admin.adminAddress;

    // 모든 유저의 지갑 로드
    const wallets = await prisma.userWallet.findMany({
      where: { depositAddress: { not: null } },
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

    // 어드민 지갑 제외
    const walletsExcludingAdmin = wallets.filter(
      (w) => !w.depositAddress || _getAddress(w.depositAddress) !== adminAddress
    );

    const decimals = (await usdt.decimals().catch(() => 18)) ?? 18;

    // ★ 체인별 집금 최소 USDT 임계치
    // TESTNET 계열이면 1 USDT, 그 외(메인넷)는 100 USDT
    const isTestnet = /TESTNET/i.test(C.id);
    const minUsdtForSweepUnits = ethers.parseUnits(
      isTestnet ? "1" : "100",
      decimals
    );

    await runBalanceOnlyPass({
      provider,
      usdt,
      decimals,
      wallets: walletsExcludingAdmin,
      adminAddress,
      adminSigner: admin.adminSigner, // 가스비 보충 및 반환용
      bnbMinWei: BNB_MIN,
      concurrency: C.balanceConcurrency,
      progressEvery: C.balanceLogEveryN,
      sweepIfUsdtGtZero: C.sweepIfUsdtGtZero,
      // 필요시 탑업 양 조정 가능:
      // topUpFixedAmountWei: ethers.parseEther("0.01"),
      minUsdtForSweepUnits,
    });

    console.log(`[sweep] balance-only cycle done in ${Date.now() - started}ms`);
  } catch (e) {
    console.error("[sweep] fatal:", e);
  } finally {
    running = false;
  }
}

/* ────────────────────────────────────────────────────────────────────
   직접 실행 시 main() 진입
   (node/tsx src/worker/sweep/runner.ts)
   ──────────────────────────────────────────────────────────────────── */
async function runOnce() {
  await scanAndSweepOnce();
}

async function runLoop() {
  console.log("[sweep] runner starting...");

  // 시작 시점의 설정 로드
  const { intervalMs } = await loadActiveChainConfig();

  await scanAndSweepOnce().catch(console.error);

  // intervalMs(=SystemKV.value)를 사용
  timer = setInterval(() => {
    // 실시간 주기 변경 반영 필요 시:
    // loadActiveChainConfig().then(cfg => { intervalMs = cfg.intervalMs; }).catch(() => {});
    scanAndSweepOnce().catch(console.error);
  }, intervalMs);

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
    console.log("[sweep] runner stopped.");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

async function main() {
  const args = process.argv.slice(2);
  const forceOnce = args.includes("--once");
  if (forceOnce) {
    await runOnce();
    return;
  }
  await runLoop();
}

/** ★ ESM 안전한 “직접 실행” 가드 */
const directRun = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    const entryUrl = new URL(`file://${entry}`).href;
    return entryUrl === import.meta.url;
  } catch {
    return false;
  }
})();

if (directRun) {
  main().catch((e) => {
    console.error("[sweep:runner] fatal:", e);
    process.exit(1);
  });
}
