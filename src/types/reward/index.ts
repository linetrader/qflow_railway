// src/types/reward/index.ts
// 프론트엔드
export type FilterMode = "ALL" | "USDT" | "DFT";

export type UnifiedRow = {
  id: string;
  date: string; // ISO 8601 or human readable
  amount: number;
  unit: "USDT" | "DFT";
  title: string;
  subtitle?: string;
  type: "USDT" | "DFT";
  status?: "PENDING" | "COMPLETED" | "REJECTED"; // USDT only
};

export type DftSummary = {
  totalDFT: number;
  todayDFT: number;
  yesterdayDFT: number;
  calculatedAt: string;
} | null;

export type Totals = {
  totalUSDT: number;
  dftSummary: DftSummary;
};

export type ApiCursorAll = {
  kind: "ALL";
  cursor: string;
};

export type ApiCursorSingle = {
  kind: "SINGLE";
  cursor: string;
};

export type NextCursor = ApiCursorAll | ApiCursorSingle | null;

export type RewardsPageSuccess = {
  mode: FilterMode;
  items: UnifiedRow[];
  nextCursor: NextCursor;
  totals: Totals;
};

export type RewardsPageError = {
  ok: false;
  code?: string;
  message?: string;
};

export type RewardsPageResponse = RewardsPageSuccess | RewardsPageError;

export function isErr(x: RewardsPageResponse): x is RewardsPageError {
  return (x as RewardsPageError).ok === false;
}

// ViewModel for History table row
export type HistoryRowVM = {
  id: string;
  note: string;
  date: string;
  amount: number;
};

// Hook state / actions / derived
export type RewardsState = {
  mode: FilterMode;
  loading: boolean;
  error: string | null;
  rows: UnifiedRow[];
  nextCursor: NextCursor;
  totals: Totals;
};

export type RewardsActions = {
  switchMode: (m: FilterMode) => void;
  loadMore: () => void;
  reloadAll: () => void;
};

export type RewardsDerived = {
  tableRows: HistoryRowVM[];
  totalCountLabel: string;
};

// -----------------------------
// 백엔드 (API 라우트에서 사용)
// -----------------------------

/**
 * 라우트 내부 연산용 "키셋 커서" 타입들
 * - DB where 조건 생성에 사용 (createdAt desc, id desc)
 * - 외부로 노출되지 않음(응답에는 프론트 커서 NextCursor 사용)
 */
export type KeysetCursorSingle = {
  ts?: string | null; // ISO
  id?: string | null; // 원본 PK
};

export type KeysetCursorAll = {
  usdtTs?: string | null;
  usdtId?: string | null;
  dftTs?: string | null;
  dftId?: string | null;
};

/**
 * 라우트 내부 전용 출력 행 (USDT) — 커서 원본 포함
 * 응답(items)은 Front의 UnifiedRow 형태로 직렬화 가능하지만,
 * 서버 내부 병합/커서 계산을 위해 _raw_* 필드를 유지합니다.
 */
export type UsdtOut = {
  id: string; // "USDT:<id>"
  ts: number; // createdAt.getTime()
  date: string; // 프론트 표시용 포맷 "YYYY-MM-DD HH:mm"
  type: "USDT";
  title: string;
  subtitle: string;
  amount: number;
  unit: "USDT";
  status: string; // "PENDING" | "COMPLETED" | "REJECTED" 등 문자열화
  _raw_id: string; // 원본 PK
  _raw_ts: Date; // 원본 createdAt
};

/** 라우트 내부 전용 출력 행 (DFT) — 커서 원본 포함 */
export type DftOut = {
  id: string; // "DFT:<id>"
  ts: number;
  date: string;
  type: "DFT";
  title: string;
  subtitle: string;
  amount: number;
  unit: "DFT";
  _raw_id: string;
  _raw_ts: Date;
};

export type MergedOut = UsdtOut | DftOut;

/** 요약(Totals) — 라우트 계산 결과 구조 */
export type TotalsPayload = {
  totalUSDT: number;
  dftSummary: {
    totalDFT: number;
    todayDFT: number;
    yesterdayDFT: number;
    calculatedAt: string; // "YYYY-MM-DD HH:mm"
  };
};

/**
 * 라우트 성공 응답 페이로드
 * - 프론트의 RewardsPageSuccess 구조에 ok: true 만 추가하여 사용
 * - nextCursor는 프론트 타입(NextCursor: { kind; cursor: string } | null)을 그대로 반환
 */
export type RouteSuccessPayload = {
  ok: true;
} & RewardsPageSuccess;

/** 라우트 에러 응답 — 프론트의 RewardsPageError를 그대로 사용 */
export type RouteErrorPayload = RewardsPageError;

/**
 * 쿼리 파라미터 파싱 결과(내부용)
 * - filter, limit, cursor(프론트 커서 문자열 기반) 외
 * - 구버전 커서 파라미터를 받아 키셋 커서로 해석해둘 수도 있음
 */
export type ParsedQuery = {
  mode: FilterMode; // "ALL" | "USDT" | "DFT"
  limit: number; // 1..100
  /** 프론트 커서: kind + cursor(string; 서버가 디코드해서 사용) */
  cursor: NextCursor;
  /** 서버 내부 연산용으로 디코드된 키셋 커서 (있을 수도/없을 수도) */
  keysetSingle?: KeysetCursorSingle;
  keysetAll?: KeysetCursorAll;
};
