// 목록 행
export type MlmPlanListItem = {
  id: string;
  name: string;
  isActive: boolean;
  levelsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MlmPlanListResponse = { items: MlmPlanListItem[] };

// 생성/수정 바디
export type MlmLevelInput = { level: number; percent: string }; // Decimal -> string
export type MlmPlanStructureInput = { levels: MlmLevelInput[] };

export type MlmPlanCreateBody = {
  name: string;
  isActive: boolean;
  structure?: MlmPlanStructureInput;
};
export type MlmPlanUpdateBody = Partial<MlmPlanCreateBody>;

// 응답
export type MlmPlanCreateResponse =
  | { ok: true; item: MlmPlanListItem }
  | { ok: false; error: string };
export type MlmPlanUpdateResponse =
  | { ok: true; item: MlmPlanListItem }
  | { ok: false; error: string };
export type MlmPlanDeleteResponse =
  | { ok: true; id: string }
  | { ok: false; error: string };

// 상세(편집 프리필)
export type MlmPlanDetailItem = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  structure: MlmPlanStructureInput;
};
export type MlmPlanDetailResponse =
  | { ok: true; item: MlmPlanDetailItem }
  | { ok: false; error: string };
