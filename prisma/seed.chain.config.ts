// scripts/seed.chain.config.ts
import { prisma } from "@/lib/prisma";
import { getAddress } from "ethers";

async function main() {
  // 공통 기본값
  const DEFAULT_CONCURRENCY = 25; // balanceConcurrency
  const DEFAULT_LOG_EVERY_N = 200; // balanceLogEveryN
  const DEFAULT_SWEEP_IF_GT_ZERO = true;

  // ── 테스트넷 ───────────────────────────────────────────────
  await prisma.adminChainConfig.upsert({
    where: { id: "BSC_TESTNET" },
    create: {
      id: "BSC_TESTNET",
      rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      usdtAddress: getAddress("0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"),
      confirmations: 5,
      scanBatch: 2000,
      bnbMinForSweep: "0.001",
      isEnabled: true,
      // balance-only runner 설정
      balanceConcurrency: DEFAULT_CONCURRENCY,
      balanceLogEveryN: DEFAULT_LOG_EVERY_N,
      sweepIfUsdtGtZero: DEFAULT_SWEEP_IF_GT_ZERO,
    },
    update: {
      rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      usdtAddress: getAddress("0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"),
      confirmations: 5,
      scanBatch: 2000,
      bnbMinForSweep: "0.001",
      isEnabled: true,
      balanceConcurrency: DEFAULT_CONCURRENCY,
      balanceLogEveryN: DEFAULT_LOG_EVERY_N,
      sweepIfUsdtGtZero: DEFAULT_SWEEP_IF_GT_ZERO,
    },
  });

  // ── 메인넷(예시) ───────────────────────────────────────────
  await prisma.adminChainConfig.upsert({
    where: { id: "BSC_MAINNET" },
    create: {
      id: "BSC_MAINNET",
      rpcUrl: "https://bsc-dataseed.binance.org",
      usdtAddress: getAddress("0x55d398326f99059fF775485246999027B3197955"),
      confirmations: 15,
      scanBatch: 2000,
      bnbMinForSweep: "0.001",
      isEnabled: true,
      balanceConcurrency: DEFAULT_CONCURRENCY,
      balanceLogEveryN: DEFAULT_LOG_EVERY_N,
      sweepIfUsdtGtZero: DEFAULT_SWEEP_IF_GT_ZERO,
    },
    update: {
      rpcUrl: "https://bsc-dataseed.binance.org",
      usdtAddress: getAddress("0x55d398326f99059fF775485246999027B3197955"),
      confirmations: 15,
      scanBatch: 2000,
      bnbMinForSweep: "0.001",
      isEnabled: true,
      balanceConcurrency: DEFAULT_CONCURRENCY,
      balanceLogEveryN: DEFAULT_LOG_EVERY_N,
      sweepIfUsdtGtZero: DEFAULT_SWEEP_IF_GT_ZERO,
    },
  });

  // ── 활성 체인 지정 ─────────────────────────────────────────
  // 기존 코드의 잘못된 key("BSC_TESTNET") 대신, active_chain 키를 사용
  await prisma.systemKV.upsert({
    where: { key: "BSC_TESTNET" },
    create: { key: "BSC_TESTNET", value: "2000" },
    update: { value: "2000" },
  });

  console.log("[seed.chain.config] done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
