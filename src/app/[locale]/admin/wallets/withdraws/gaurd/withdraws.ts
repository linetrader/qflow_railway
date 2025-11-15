// src/app/[locale]/admin/wallets/withdraws/gaurd/withdraws.ts
// API 응답을 Zod 로 검증하고, 타입 안전한 객체로 파싱하는 가드 모듈

import { z } from "zod";
import type {
  AdminWithdrawRow,
  AdminWithdrawListResponse,
  AdminWithdrawActionResponse,
} from "../types";

// 단일 출금 행에 대한 Zod 스키마
// - 서버에서 내려오는 JSON 구조를 검증한다.
const WithdrawRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  tokenCode: z.string(),
  amount: z.string(),
  status: z.string(), // 런타임에서는 string 이지만, 최종 타입캐스팅은 WalletTxStatus 로 처리
  memo: z.string().nullable(),
  withdrawAddress: z.string().nullable(),
  createdAt: z.string(),
});

// GET 응답(ok=true) 스키마
const ListOkSchema = z.object({
  ok: z.literal(true),
  data: z.array(WithdrawRowSchema),
});

// GET 응답(ok=false) 스키마
const ListErrSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
});

// POST 응답(ok=true) 스키마
const ActionOkSchema = z.object({
  ok: z.literal(true),
  txHash: z.string().optional(),
});

// POST 응답(ok=false) 스키마
const ActionErrSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
});

// GET /api/admin/wallets/withdraws 응답 파서
// - unknown JSON → AdminWithdrawListResponse 로 변환
// - 형식이 맞지 않으면 code="INVALID_RESPONSE" 로 처리
export function parseWithdrawListResponse(
  json: unknown
): AdminWithdrawListResponse {
  // 1) ok=true 형태 먼저 시도
  const okParsed = ListOkSchema.safeParse(json);
  if (okParsed.success) {
    // Zod 결과를 AdminWithdrawRow 타입으로 매핑
    const rows: AdminWithdrawRow[] = okParsed.data.data.map((r) => ({
      id: r.id,
      userId: r.userId,
      username: r.username,
      tokenCode: r.tokenCode,
      amount: r.amount,
      // status 는 런타임상 string 이지만, WalletTxStatus 로 캐스팅
      status: r.status as never,
      memo: r.memo,
      withdrawAddress: r.withdrawAddress,
      createdAt: r.createdAt,
    }));
    return { ok: true, data: rows };
  }

  // 2) ok=false 형태 시도
  const errParsed = ListErrSchema.safeParse(json);
  if (errParsed.success) {
    return {
      ok: false,
      code: errParsed.data.code,
      message: errParsed.data.message,
    };
  }

  // 3) 어느 쪽에도 맞지 않으면 INVALID_RESPONSE 로 반환
  return {
    ok: false,
    code: "INVALID_RESPONSE",
    message: "Unexpected response format",
  };
}

// POST /api/admin/wallets/withdraws 응답 파서
// - unknown JSON → AdminWithdrawActionResponse 로 변환
// - 형식이 맞지 않으면 code="INVALID_RESPONSE" 로 처리
export function parseWithdrawActionResponse(
  json: unknown
): AdminWithdrawActionResponse {
  // 1) ok=true 형태 먼저 시도
  const okParsed = ActionOkSchema.safeParse(json);
  if (okParsed.success) {
    return { ok: true, txHash: okParsed.data.txHash };
  }

  // 2) ok=false 형태 시도
  const errParsed = ActionErrSchema.safeParse(json);
  if (errParsed.success) {
    return {
      ok: false,
      code: errParsed.data.code,
      message: errParsed.data.message,
    };
  }

  // 3) 어느 쪽에도 맞지 않으면 INVALID_RESPONSE 로 반환
  return {
    ok: false,
    code: "INVALID_RESPONSE",
    message: "Unexpected response format",
  };
}
