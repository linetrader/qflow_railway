// FILE: /src/types/admin/mining-policies.ts

// 목록 행
export type MiningPolicyListItem = {
  id: string;
  name: string;
  isActive: boolean;
  companyPct: string; // Decimal → string
  selfPct: string;
  mlmPct: string;
  companyUserName?: string; // 선택: 뷰에 표시용
  mlmReferralPlanName?: string;
  levelBonusPlanName?: string;
  effectiveFrom: string; // ISO
  effectiveTo?: string; // ISO | undefined
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type MiningPolicyListResponse = {
  items: MiningPolicyListItem[];
};

// 생성/수정 바디
export type MiningPolicyCreateBody = {
  name: string;
  isActive: boolean;
  companyPct: string;
  selfPct: string;
  mlmPct: string;
  companyUserId: string;
  mlmReferralPlanId: string;
  levelBonusPlanId: string;
  effectiveFrom: string; // ISO
  effectiveTo?: string; // ISO | undefined
};

export type MiningPolicyUpdateBody = Partial<MiningPolicyCreateBody>;

// 공통 응답
export type MiningPolicyCreateResponse =
  | { ok: true; item: MiningPolicyListItem }
  | { ok: false; error: string };

export type MiningPolicyUpdateResponse =
  | { ok: true; item: MiningPolicyListItem }
  | { ok: false; error: string };

export type MiningPolicyDeleteResponse =
  | { ok: true; id: string }
  | { ok: false; error: string };

// 상세 보기(필요 시 확장 가능)
export type MiningPolicyDetailItem = {
  id: string;
  name: string;
  isActive: boolean;

  companyPct: string;
  selfPct: string;
  mlmPct: string;

  // ⬇️ 편집 시 필요한 실제 ID 필드들 추가
  companyUserId: string;
  mlmReferralPlanId: string;
  levelBonusPlanId: string;

  // 표시는 그대로 문자열
  companyUserName?: string;
  mlmReferralPlanName?: string;
  levelBonusPlanName?: string;

  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
};

export type MiningPolicyDetailResponse =
  | { ok: true; item: MiningPolicyDetailItem }
  | { ok: false; error: string };
