// 모든 타입은 여기로 모읍니다. any/JSX.Element/React.ReactNode 사용 금지.

export type WorkerMode = "once" | "loop";
export type WorkerLogLevel = "debug" | "info" | "warn" | "error";

// FILE: /src/types/admin/level-policies.ts
export type LevelPolicyListItem = {
  id: string;
  name: string;
  isActive: boolean;
  levelsCount: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type LevelPolicyListResponse = {
  items: LevelPolicyListItem[];
};

// --- 신규 상세 입력용 타입들 ---
export type RequirementKind =
  | "NODE_AMOUNT_MIN"
  | "GROUP_SALES_AMOUNT_MIN"
  | "DIRECT_REFERRAL_COUNT_MIN"
  | "DIRECT_DOWNLINE_LEVEL_COUNT_MIN";

export type RequirementInput = {
  kind: RequirementKind;
  amount?: string; // 금액류 요건일 때
  count?: number; // 카운트 요건일 때
  targetLevel?: number; // 직접 하위 레벨 요건일 때
};

export type GroupInput = {
  ordinal: number;
  requirements: RequirementInput[];
};

export type LevelInput = {
  level: number;
  groups: GroupInput[];
};

export type LevelPolicyStructureInput = {
  levels: LevelInput[];
};
// --- 여기까지 신규 ---

export type LevelPolicyCreateBody = {
  name: string;
  isActive: boolean;
  // 신규: 상세 구조(선택)
  structure?: LevelPolicyStructureInput;
};

export type LevelPolicyUpdateBody = {
  name?: string;
  isActive?: boolean;
  // 신규: 상세 구조(선택) - 제공 시 기존 구조를 갈아끼웁니다(치환)
  structure?: LevelPolicyStructureInput;
};

export type LevelPolicyCreateResponse =
  | { ok: true; item: LevelPolicyListItem }
  | { ok: false; error: string };

export type LevelPolicyUpdateResponse =
  | { ok: true; item: LevelPolicyListItem }
  | { ok: false; error: string };

export type LevelPolicyDeleteResponse =
  | { ok: true; id: string }
  | { ok: false; error: string };

// 상세 조회 응답
export type LevelPolicyDetailItem = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  structure: LevelPolicyStructureInput;
};

export type LevelPolicyDetailResponse =
  | { ok: true; item: LevelPolicyDetailItem }
  | { ok: false; error: string };
