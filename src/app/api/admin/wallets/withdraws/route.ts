// src/app/api/admin/wallets/withdraws/route.ts

// 관리자 출금 승인/거절 API 라우트
// - GET  : status = PENDING 인 WalletTx 목록 조회
// - POST : 출금 승인(approve) → 체인 전송 + COMPLETED, 취소(reject) → REJECTED

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  JsonRpcProvider,
  Wallet,
  isAddress,
  getAddress,
  parseUnits,
  Contract,
} from "ethers";
import { prisma } from "@/lib/prisma";
import { decryptTextAesGcm } from "@/lib/encrypt";
import { loadActiveChainConfig } from "@/worker/sweep/chain-config";
import type { WalletTxStatus } from "@/generated/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ----------------------------------------------------------------
 *  공통 유틸 (admin-wallet 코드와 동일 패턴)
 *  ---------------------------------------------------------------- */

// Promise 에 타임아웃을 걸어주는 유틸 함수
// - ms 안에 응답 없으면 에러 발생
// - label 이 있으면 에러 메시지에 함께 포함
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

// RPC Provider 캐시 (매 요청마다 새 연결하지 않기 위해)
// - key: rpcUrl
// - value: JsonRpcProvider 인스턴스
const providerCache = new Map<string, JsonRpcProvider>();

// chain RPC URL 기준으로 Provider 가져오기 (캐시 사용)
function getProvider(rpcUrl: string): JsonRpcProvider {
  const cached = providerCache.get(rpcUrl);
  if (cached) return cached;
  const p = new JsonRpcProvider(rpcUrl);
  providerCache.set(rpcUrl, p);
  return p;
}

// 최소한의 ERC20 ABI (decimals, transfer)
const erc20Abi = [
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
] as const;

// 관리자 지갑 서명자 로딩
// - username = "admin" 인 User 찾기
// - UserWallet 에 저장된 암호화된 개인키 복호화
// - Wallet + Provider 조합으로 signer 생성
// - depositAddress 가 비어있으면 1회성으로 DB에 보정 저장
async function getAdminSigner(rpcUrl: string): Promise<{
  signer: Wallet;
  provider: JsonRpcProvider;
  address: `0x${string}`;
}> {
  // admin 계정 조회
  const adminUser = await prisma.user.findUnique({
    where: { username: "admin" },
    select: { id: true },
  });
  if (!adminUser) {
    throw new Error("admin user not found");
  }

  // admin UserWallet 에서 암호화된 키 정보 조회
  const uw = await prisma.userWallet.findUnique({
    where: { userId: adminUser.id },
    select: {
      depositAddress: true,
      depositPrivCipher: true,
      depositPrivIv: true,
      depositPrivTag: true,
      depositKeyVersion: true,
    },
  });

  // 키가 세팅되지 않은 경우 에러
  if (
    !uw ||
    !uw.depositPrivCipher ||
    !uw.depositPrivIv ||
    !uw.depositPrivTag ||
    !uw.depositKeyVersion
  ) {
    throw new Error("admin wallet key not provisioned in DB");
  }

  // AES-GCM 으로 암호화된 개인키 복호화
  const pk = decryptTextAesGcm({
    ciphertextB64: uw.depositPrivCipher,
    ivB64: uw.depositPrivIv,
    tagB64: uw.depositPrivTag,
    alg: "aes-256-gcm" as const,
    version: Number(uw.depositKeyVersion || 1),
  });

  // Provider 및 signer 생성
  const provider = getProvider(rpcUrl);
  const signer = new Wallet(pk, provider);
  const address = signer.address as `0x${string}`;

  // depositAddress 가 비어 있으면 현재 주소를 DB 에 업데이트 (최초 1회)
  if (!uw.depositAddress) {
    await prisma.userWallet.update({
      where: { userId: adminUser.id },
      data: { depositAddress: address },
    });
  }

  return { signer, provider, address };
}

/** ----------------------------------------------------------------
 *  GET: status = PENDING 인 WalletTx(출금 요청) 리스트
 *  ---------------------------------------------------------------- */
// - 관리자 출금 승인 화면에서 사용
// - 아직 처리되지 않은(PENDING) 출금 요청만 가져온다
// - 각 요청에 대해 해당 유저의 withdrawAddress 도 포함해서 내려준다
export async function GET() {
  try {
    // 1) PENDING 상태의 WalletTx 목록 조회
    const pending = await prisma.walletTx.findMany({
      where: {
        status: "PENDING" as WalletTxStatus,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        userId: true,
        tokenCode: true,
        amount: true,
        status: true,
        memo: true,
        createdAt: true,
        user: {
          // 유저명도 함께 표시하기 위해 join
          select: {
            username: true,
          },
        },
      },
    });

    // 2) 해당 userId 목록 추출 후 중복 제거
    const userIds: string[] = Array.from(new Set(pending.map((p) => p.userId)));

    // 3) UserWallet 에서 withdrawAddress 조회
    const wallets = await prisma.userWallet.findMany({
      where: {
        userId: { in: userIds },
      },
      select: {
        userId: true,
        withdrawAddress: true,
      },
    });

    // userId → withdrawAddress 매핑
    const walletMap = new Map<string, string | null>();
    for (const w of wallets) {
      walletMap.set(w.userId, w.withdrawAddress ?? null);
    }

    // 4) API 응답용 형태로 매핑
    const data = pending.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.user.username,
      tokenCode: p.tokenCode,
      amount: p.amount.toString(), // Decimal → string
      status: p.status,
      memo: p.memo ?? null,
      withdrawAddress: walletMap.get(p.userId) ?? null,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    // 알 수 없는 예외
    return NextResponse.json(
      {
        ok: false,
        code: "UNKNOWN",
        message: (e as Error).message,
      },
      { status: 500 }
    );
  }
}

/** ----------------------------------------------------------------
 *  POST: 승인(approve) / 취소(reject)
 *  ---------------------------------------------------------------- */

// 출금 처리 요청 payload 검증 스키마
// - id    : WalletTx.id (cuid)
// - action: "approve" 또는 "reject"
const PostSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(["approve", "reject"]),
});

type PostInput = z.infer<typeof PostSchema>;

// 허용되는 자산 종류 (BNB, USDT, DFT)
type AssetKind = "BNB" | "USDT" | "DFT";

// WalletTx.tokenCode → 실제 체인에서 전송할 자산 종류로 매핑
function mapTokenCodeToAsset(tokenCode: string): AssetKind {
  if (tokenCode === "BNB") {
    return "BNB";
  }
  if (tokenCode === "USDT") {
    return "USDT";
  }
  if (tokenCode === "DFT") {
    return "DFT";
  }
  // 이 외의 토큰은 출금 지원 X
  throw new Error(`Unsupported tokenCode for withdraw: ${tokenCode}`);
}

// 관리자(admin) 지갑에서 실제 체인 전송 수행
// - params.asset              : 전송할 자산 종류
// - params.amountDecimalString: "0.123" 같은 10진 문자열
// - params.to                 : 수신 주소(유저 withdrawAddress)
async function sendAssetFromAdmin(params: {
  asset: AssetKind;
  amountDecimalString: string;
  to: string;
}): Promise<string> {
  // 활성 체인 설정 로드
  const chainCfg = await loadActiveChainConfig();
  // 관리자 서명자 (hot wallet 개념)
  const {
    signer,
    provider,
    address: from,
  } = await getAdminSigner(chainCfg.rpcUrl);

  // 수신 주소 체크 및 체크섬 보정
  const to = getAddress(params.to);

  // 1) BNB 출금 처리 (native token)
  if (params.asset === "BNB") {
    // BNB 는 18 decimals 고정
    const value = parseUnits(params.amountDecimalString, 18);

    // 현재 BNB 잔고 조회
    const balance =
      (await withTimeout(
        provider.getBalance(from),
        2000,
        "getBalance(BNB)"
      ).catch(() => 0n)) ?? 0n;

    // 잔고 부족 시 에러
    if (balance < value) {
      throw new Error("INSUFFICIENT_BNB_FOR_WITHDRAW");
    }

    // 체인 전송 (타임아웃 보호)
    const tx = await withTimeout(
      signer.sendTransaction({ to, value }),
      5000,
      "sendTransaction(BNB)"
    );
    return tx.hash;
  }

  // 2) ERC20(USDT, DFT) 출금 처리
  // 체인 설정에서 토큰 컨트랙트 주소 가져오기
  const tokenAddr: string | null =
    params.asset === "USDT"
      ? chainCfg.usdtAddress
      : params.asset === "DFT"
      ? chainCfg.dftAddress ?? null
      : null;

  if (!tokenAddr || !isAddress(tokenAddr)) {
    // 토큰 주소 미설정 또는 잘못된 주소일 경우
    throw new Error(`TOKEN_ADDR_MISSING:${params.asset}`);
  }

  const contract = new Contract(tokenAddr, erc20Abi, signer);

  // decimals 조회 (타임아웃 + 기본값 보호)
  const decimalsNumber: number = Number(
    await withTimeout(
      contract.decimals(),
      1500,
      `${params.asset}.decimals`
    ).catch(() => (params.asset === "USDT" ? 6 : 18))
  );

  // 문자열 amount → on-chain 정수 단위로 변환
  const amount = parseUnits(params.amountDecimalString, decimalsNumber);

  // 가스비로 쓸 BNB 잔고 확인 (0 이하면 전송 불가)
  const gasBalance =
    (await withTimeout(
      provider.getBalance(from),
      2000,
      "getBalance(gas)"
    ).catch(() => 0n)) ?? 0n;

  if (gasBalance <= 0n) {
    throw new Error("NO_GAS_FOR_TOKEN_TRANSFER");
  }

  // ERC20 transfer 호출 (타임아웃 보호)
  const tx = await withTimeout(
    contract.transfer(to, amount),
    5000,
    `${params.asset}.transfer`
  );
  return tx.hash;
}

// 출금 승인/취소 처리 엔드포인트
export async function POST(req: Request) {
  try {
    // 1) 요청 바디 파싱 및 검증
    const body = (await req.json()) as unknown;
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_INPUT",
          message: "Invalid payload",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input: PostInput = parsed.data;

    // ----------------------------------------------------------------
    // action = "reject" → 단순 상태 변경 (PENDING → REJECTED)
    // ----------------------------------------------------------------
    if (input.action === "reject") {
      // 이미 처리된 건은 변경되지 않도록 status 조건 포함
      const result = await prisma.walletTx.updateMany({
        where: {
          id: input.id,
          status: "PENDING" as WalletTxStatus,
        },
        data: {
          status: "REJECTED" as WalletTxStatus,
        },
      });

      // 업데이트된 행이 0개면: 없는 Tx 이거나 PENDING 이 아님
      if (result.count === 0) {
        return NextResponse.json(
          {
            ok: false,
            code: "NOT_FOUND_OR_ALREADY_PROCESSED",
            message: "Tx not found or not PENDING",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // ----------------------------------------------------------------
    // action = "approve" → 체인 출금 + COMPLETED 세팅
    // ----------------------------------------------------------------

    // 2) 대상 WalletTx 조회
    const txRow = await prisma.walletTx.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        userId: true,
        tokenCode: true,
        amount: true,
        status: true,
      },
    });

    if (!txRow) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_FOUND",
          message: "WalletTx not found",
        },
        { status: 404 }
      );
    }

    // PENDING 상태가 아니면 승인 불가
    if (txRow.status !== ("PENDING" as WalletTxStatus)) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_STATUS",
          message: "Only PENDING tx can be approved",
        },
        { status: 400 }
      );
    }

    // 3) 유저의 출금 주소 조회
    const userWallet = await prisma.userWallet.findUnique({
      where: { userId: txRow.userId },
      select: {
        withdrawAddress: true,
      },
    });

    if (!userWallet || !userWallet.withdrawAddress) {
      return NextResponse.json(
        {
          ok: false,
          code: "NO_WITHDRAW_ADDRESS",
          message: "User withdraw address not set",
        },
        { status: 400 }
      );
    }

    // 4) tokenCode → 실제 전송할 자산 종류 매핑
    const asset = mapTokenCodeToAsset(txRow.tokenCode);
    const amountDecimalString = txRow.amount.toString();
    const to = userWallet.withdrawAddress;

    // 5) 관리자 지갑 주소(fromAddress) 확보 (DB 기록용)
    const chainCfg = await loadActiveChainConfig();
    const { address: fromAddress } = await getAdminSigner(chainCfg.rpcUrl);

    // 6) 관리자 지갑에서 출금 주소로 전송
    const txHash = await sendAssetFromAdmin({
      asset,
      amountDecimalString,
      to,
    });

    // 7) WalletTx 상태 및 체인 정보 업데이트
    await prisma.walletTx.update({
      where: { id: txRow.id },
      data: {
        status: "COMPLETED" as WalletTxStatus,
        txHash,
        fromAddress: fromAddress,
        toAddress: to,
      },
    });

    return NextResponse.json({
      ok: true,
      txHash,
    });
  } catch (e) {
    // 최상위 예외 핸들링
    return NextResponse.json(
      {
        ok: false,
        code: "UNKNOWN",
        message: (e as Error).message,
      },
      { status: 500 }
    );
  }
}
