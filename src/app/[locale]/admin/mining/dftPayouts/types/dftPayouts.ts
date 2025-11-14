// 모든 타입은 여기서만 관리
export type IsoDateString = string;

export interface DftPayoutRow {
  id: string;
  userId: string;
  username?: string; // ← 표시용(옵션)
  name: string;
  amountDFT: number;
  note: string | null;
  miningPayoutId: string | null;
  createdAt: IsoDateString;
}

export interface DftPayoutQuery {
  page: number;
  pageSize: number;
  userId?: string;
  username?: string; // ← username 검색 추가
  search?: string;
  dateFrom?: IsoDateString;
  dateTo?: IsoDateString;
  hasMiningPayout?: "yes" | "no" | "all";
  sort?: "createdAt_desc" | "createdAt_asc" | "amount_desc" | "amount_asc";
}

export interface DftPayoutsMeta {
  page: number;
  pageSize: number;
  total: number;
  sumAmountDFT: number; // ← 현재 필터(=username 포함)로 집계된 총합
}

export interface DftPayoutsPayload {
  items: DftPayoutRow[];
}

export interface ApiOk<T> {
  ok: true;
  data: T;
  meta?: DftPayoutsMeta;
}

export interface ApiErr {
  ok: false;
  code: "UNAUTHORIZED" | "INVALID_PARAM" | "INTERNAL";
  message?: string;
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;
