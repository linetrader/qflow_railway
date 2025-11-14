// src/worker/sweep/pass/balance-only.ts

import { prisma } from "@/lib/prisma";
import { Wallet, getAddress as _getAddress, ethers } from "ethers";
import type { Erc20 } from "../types";
import { toDecimalFromBigint, fmtBNB } from "../utils/format";
import { decryptTextAesGcm } from "@/lib/encrypt";

export async function runBalanceOnlyPass(opts: {
  provider: ethers.JsonRpcProvider;
  usdt: Erc20;
  decimals: number;
  wallets: {
    userId: string;
    depositAddress: string | null;
    depositPrivCipher: string | null;
    depositPrivIv: string | null;
    depositPrivTag: string | null;
    depositKeyAlg: string | null;
    depositKeyVersion: number | null;
  }[];
  adminAddress: `0x${string}`;
  /** 관리지갑 서명자: BNB 보충 및 반환 트랜잭션 전송 */
  adminSigner?: Wallet;
  /** 스윕에 필요한 최소 BNB (wei) */
  bnbMinWei: bigint;
  concurrency: number;
  progressEvery: number;
  /** true일 때만 스윕 로직 활성 */
  sweepIfUsdtGtZero: boolean;
  /** 부족 시 고정 탑업 양(기본 0.01 BNB) */
  topUpFixedAmountWei?: bigint;
  /** 체인별 집금 최소 USDT (토큰 최소단위, BigInt) */
  minUsdtForSweepUnits: bigint;
}) {
  const {
    provider,
    usdt,
    decimals,
    wallets,
    adminAddress,
    adminSigner,
    bnbMinWei,
    concurrency,
    progressEvery,
    sweepIfUsdtGtZero,
    topUpFixedAmountWei = ethers.parseEther("0.01"),
    minUsdtForSweepUnits,
  } = opts;

  const targets = wallets.filter((w) => !!w.depositAddress);

  // 사람이 보기 쉬운 표시 (예: 100.0 또는 1.0 등)
  const minUsdtHuman = toDecimalFromBigint(
    minUsdtForSweepUnits,
    decimals
  ).toString();

  console.log(
    `[sweep][balance-only] start: ${
      targets.length
    } addresses (conc=${concurrency}, sweep=${
      sweepIfUsdtGtZero ? "on" : "off"
    }, topup=${adminSigner ? "on" : "off"}, topUpFixed=${fmtBNB(
      topUpFixedAmountWei
    )} BNB, minUSDT=${minUsdtHuman})`
  );

  let sweptCount = 0;

  // 내부 간단 concurrency 유틸
  async function mapWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T, idx: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length) as R[];
    let next = 0;
    const workers = Array.from({ length: Math.max(1, limit) }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) break;
        results[i] = await fn(items[i], i);
      }
    });
    await Promise.all(workers);
    return results;
  }

  /** 관리지갑 → 대상지갑으로 0.01 BNB 고정 탑업 */
  async function topUpFixed(params: { addr: `0x${string}` }): Promise<boolean> {
    if (!adminSigner) return false;
    try {
      const adminBal = await provider.getBalance(adminSigner.address);
      if (adminBal <= topUpFixedAmountWei) {
        console.warn(
          `[sweep][topup][skip] admin balance too low: have=${fmtBNB(
            adminBal
          )}, need>=${fmtBNB(topUpFixedAmountWei)}`
        );
        return false;
      }
      const tx = await adminSigner.sendTransaction({
        to: params.addr,
        value: topUpFixedAmountWei,
      });
      const rec = await tx.wait(1);
      if (!rec) {
        console.warn(`[sweep][topup] no receipt (dropped?) ${tx.hash}`);
        return false;
      }
      console.log(
        `[sweep][topup] sent ${fmtBNB(topUpFixedAmountWei)} BNB to ${
          params.addr
        } tx=${rec.hash}`
      );
      return true;
    } catch (e) {
      console.warn(`[sweep][topup] failed to send BNB to ${params.addr}`, e);
      return false;
    }
  }

  /** 대상지갑 → 관리지갑으로 남은 BNB 전액 반환 (잔액 - 추정수수료) */
  async function sweepAllBNBBack(params: {
    fromSigner: Wallet;
    toAdmin: `0x${string}`;
  }): Promise<void> {
    const { fromSigner, toAdmin } = params;

    // 잔액 조회
    const bal = await provider.getBalance(fromSigner.address);
    if (bal === 0n) {
      console.log(
        `[sweep][bnb-back] zero balance, skip: ${fromSigner.address}`
      );
      return;
    }

    // 가스 데이터 추정 (BSC는 대개 legacy gasPrice)
    const feeData = await provider.getFeeData();
    const gasPrice =
      feeData.gasPrice ??
      // fallback 3 gwei
      1_000_000_000n * 3n;

    // 단순 송금 가스 한도 추정
    const gasLimit =
      (await provider
        .estimateGas({
          from: fromSigner.address,
          to: toAdmin,
          value: 1n, // dummy
        })
        .catch(() => Promise.resolve(21_000n))) || 21_000n;

    const fee = gasLimit * gasPrice;
    if (bal <= fee) {
      console.warn(
        `[sweep][bnb-back] not enough to cover fee: bal=${fmtBNB(
          bal
        )} fee≈${fmtBNB(fee)}`
      );
      return;
    }

    const value = bal - fee;
    try {
      const tx = await fromSigner.sendTransaction({
        to: toAdmin,
        value,
        gasLimit,
        gasPrice, // legacy 스타일로 명시
      });
      const rec = await tx.wait(1);
      if (!rec) {
        console.warn(
          `[sweep][bnb-back] no receipt (dropped?) ${tx.hash} from=${fromSigner.address}`
        );
        return;
      }
      console.log(
        `[sweep][bnb-back] returned ${fmtBNB(value)} BNB from ${
          fromSigner.address
        } tx=${rec.hash}`
      );
    } catch (e) {
      console.warn(
        `[sweep][bnb-back] failed from ${fromSigner.address} → ${toAdmin}`,
        e
      );
    }
  }

  await mapWithConcurrency(targets, concurrency, async (w, idx) => {
    const addr = _getAddress(w.depositAddress!) as `0x${string}`;
    try {
      const [bnbBal0, usdtBal] = await Promise.all([
        provider.getBalance(addr),
        usdt.balanceOf(addr),
      ]);

      const usdtDecStr = toDecimalFromBigint(usdtBal, decimals).toString();
      if (progressEvery > 0 && idx % progressEvery === 0) {
        console.log(`[sweep][balance-only] progress ${idx}/${targets.length}`);
      }
      console.log(
        `[sweep][balance-only] userId=${w.userId} addr=${addr} BNB=${fmtBNB(
          bnbBal0
        )} USDT=${usdtDecStr}`
      );

      // 집금 조건: 토글 + 체인별 임계치
      if (!sweepIfUsdtGtZero || usdtBal < minUsdtForSweepUnits) return;

      const hasPk = w.depositPrivCipher && w.depositPrivIv && w.depositPrivTag;
      if (!hasPk) return;

      // 1) BNB 부족 메시지 → 고정 0.01 BNB 탑업 → 잔액 갱신
      let bnbBal = bnbBal0;
      if (bnbBal < bnbMinWei) {
        console.warn(`[sweep][balance-only] insufficient gas: ${addr}`);
        const topped = await topUpFixed({ addr });
        if (!topped) return;
        bnbBal = await provider.getBalance(addr);
      }

      // 2) USDT 스윕: calldata 생성 + provider.estimateGas
      const depPk = decryptTextAesGcm({
        ciphertextB64: w.depositPrivCipher!,
        ivB64: w.depositPrivIv!,
        tagB64: w.depositPrivTag!,
        alg: "aes-256-gcm",
        version: Number(w.depositKeyVersion ?? 1),
      });
      const depSigner = new Wallet(depPk, provider);
      const usdtFromDep = usdt.connect(depSigner) as Erc20;

      const data = usdtFromDep.interface.encodeFunctionData("transfer", [
        adminAddress,
        usdtBal,
      ]);
      const toAddr = (await usdtFromDep.getAddress()) as `0x${string}`;

      let gasLimit: bigint;
      try {
        const gasEst = await provider.estimateGas({
          from: depSigner.address,
          to: toAddr,
          data,
        });
        gasLimit = gasEst + gasEst / 5n;
      } catch {
        gasLimit = 90_000n; // 폴백
      }

      const tx = await depSigner.sendTransaction({
        to: toAddr,
        data,
        gasLimit,
      });
      const rec = await tx.wait();
      if (!rec) {
        console.warn(`[sweep][balance-only] no receipt (dropped?) ${tx.hash}`);
        // 토큰 스윕이 불확실하면 BNB 반환은 생략
        return;
      }

      // ★★★ 변경 포인트: 내부 원장에 "입금(DEPOSIT)"로 반영 + 잔액 증가
      const sweepDec = toDecimalFromBigint(usdtBal, decimals);

      await prisma.$transaction(async (txp) => {
        // 중복 방지(동일 txHash로 이미 기록되었는지 확인)
        const exists = await txp.walletTx.findFirst({
          where: { txHash: rec.hash },
          select: { id: true },
        });
        if (exists) return;

        await txp.walletTx.create({
          data: {
            userId: w.userId,
            tokenCode: "USDT",
            txType: "DEPOSIT", // ← 입금으로 기록
            amount: sweepDec,
            status: "COMPLETED",
            memo: "user on-chain USDT deposit swept to admin",
            txHash: rec.hash,
          },
        });

        await txp.userWallet.update({
          where: { userId: w.userId },
          data: { balanceUSDT: { increment: sweepDec } }, // ← 잔액 증가
        });
      });

      console.log(
        `[sweep][balance-only][SWEEP/DEPOSIT] userId=${
          w.userId
        } from=${addr} credited=${sweepDec.toString()} tx=${rec.hash}`
      );

      // 3) 남은 BNB 전액을 어드민으로 반환
      await sweepAllBNBBack({ fromSigner: depSigner, toAdmin: adminAddress });

      sweptCount++;
    } catch (e) {
      console.warn(`[sweep][balance-only] failed addr=${addr}`, e);
    }
  });

  console.log(
    `[sweep][balance-only] done. swept=${sweptCount}/${targets.length}`
  );
}
