// src/types/site/home/index.ts
import { z } from "zod";

/** balances */
export const BalancesSchema = z.object({
  usdt: z.number(),
  qai: z.number(),
  dft: z.number(),
});
export type Balances = z.infer<typeof BalancesSchema>;

/** reward history */
export const RewardHistoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amountDFT: z.number(),
  note: z.string().nullable(),
  createdAt: z.string(), // ISO
});
export type RewardHistoryItem = z.infer<typeof RewardHistoryItemSchema>;

/** package history */
export const PackageHistoryItemSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  packageName: z.string().nullable(),
  quantity: z.number(),
  unitPrice: z.number().optional(),
  totalPrice: z.number().optional(),
  createdAt: z.string(), // ISO
});
export type PackageHistoryItem = z.infer<typeof PackageHistoryItemSchema>;

/** 성공 payload (프론트에서 사용하는 본문) */
export const ApiHomeResponseSchema = z.object({
  authed: z.boolean(),
  balances: BalancesSchema.nullable(),
  rewardHistory: z.array(RewardHistoryItemSchema),
  packageHistory: z.array(PackageHistoryItemSchema),
});
export type ApiHomeResponse = z.infer<typeof ApiHomeResponseSchema>;

/** 에러 코드 */
export const ApiHomeErrorCodeSchema = z.enum(["UNAUTH", "INTERNAL_ERROR"]);
export type ApiHomeErrorCode = z.infer<typeof ApiHomeErrorCodeSchema>;

/** 최종 API 반환 타입(서버 ↔ 프론트 공통): 판별 가능 유니온 */
export type ApiHomeSuccess = { ok: true } & ApiHomeResponse;
export type ApiHomeError = {
  ok: false;
  code: ApiHomeErrorCode;
  message?: string;
};
export type ApiHomeResult = ApiHomeSuccess | ApiHomeError;

/** 페이지 상단 카드용 타입 */
export type News = { id: string; title: string; date: string; tag?: string };
export type Event = {
  id: string;
  title: string;
  date: string;
  location?: string;
};
