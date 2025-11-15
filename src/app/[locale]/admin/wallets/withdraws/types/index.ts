// src/app/[locale]/admin/wallets/withdraws/types/index.ts
// 출금 승인/취소 어드민 화면에서 사용하는 타입 정의 모음

import type { WalletTxStatus } from "@/generated/prisma";

// 어드민 출금 목록 테이블 1행에 해당하는 데이터 구조
export type AdminWithdrawRow = {
  id: string; // WalletTx.id
  userId: string; // 유저 ID
  username: string; // 유저 닉네임/아이디
  tokenCode: string; // 토큰 코드 (BNB, USDT, DFT 등)
  amount: string; // 출금 수량 (Decimal → 문자열)
  status: WalletTxStatus; // WalletTx 상태 (PENDING / COMPLETED / REJECTED 등)
  memo: string | null; // 출금 요청 메모
  withdrawAddress: string | null; // 유저 출금 지갑 주소 (UserWallet.withdrawAddress)
  createdAt: string; // 요청 시간 (ISO 문자열)
};

// GET /api/admin/wallets/withdraws 성공 응답 타입
export type AdminWithdrawListOk = {
  ok: true;
  data: AdminWithdrawRow[]; // 출금 요청 리스트
};

// GET /api/admin/wallets/withdraws 에러 응답 타입
export type AdminWithdrawListErr = {
  ok: false;
  code: string;
  message: string;
};

// GET 응답 전체 유니온 타입
export type AdminWithdrawListResponse =
  | AdminWithdrawListOk
  | AdminWithdrawListErr;

// 승인/취소 액션 종류
export type AdminWithdrawAction = "approve" | "reject";

// POST /api/admin/wallets/withdraws 성공 응답 타입
export type AdminWithdrawActionOk = {
  ok: true;
  txHash?: string; // approve 일 때 체인 트랜잭션 해시(선택적)
};

// POST /api/admin/wallets/withdraws 에러 응답 타입
export type AdminWithdrawActionErr = {
  ok: false;
  code: string;
  message: string;
};

// POST 응답 전체 유니온 타입
export type AdminWithdrawActionResponse =
  | AdminWithdrawActionOk
  | AdminWithdrawActionErr;

// 훅에서 내부적으로 사용하는 액션 처리 결과 타입
// - 토스트 메시지 등에 사용
export type AdminWithdrawActionResult = {
  ok: boolean; // 처리 성공 여부
  message: string; // 사용자에게 보여줄 메시지
  txHash?: string; // 승인 시 트랜잭션 해시
};

// useAdminWithdraws 훅이 반환하는 전체 타입
export type UseAdminWithdrawsReturn = {
  loading: boolean; // 리스트 로딩 상태
  error: string | null; // 에러 메시지 (없으면 null)
  rows: AdminWithdrawRow[]; // PENDING 출금 요청 리스트
  refresh: () => void; // 리스트 재로딩 함수
  handleAction: (
    id: string,
    action: AdminWithdrawAction
  ) => Promise<AdminWithdrawActionResult>; // 승인/취소 처리 함수
};
