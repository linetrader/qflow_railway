export type LevelBonusPlanListItem = {
  id: string;
  name: string;
  isActive: boolean;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LevelBonusPlanListResponse = { items: LevelBonusPlanListItem[] };

export type LevelBonusItemInput = { level: number; percent: string };
export type LevelBonusPlanStructureInput = { items: LevelBonusItemInput[] };

export type LevelBonusPlanCreateBody = {
  name: string;
  isActive: boolean;
  structure?: LevelBonusPlanStructureInput;
};
export type LevelBonusPlanUpdateBody = Partial<LevelBonusPlanCreateBody>;

export type LevelBonusPlanCreateResponse =
  | { ok: true; item: LevelBonusPlanListItem }
  | { ok: false; error: string };
export type LevelBonusPlanUpdateResponse =
  | { ok: true; item: LevelBonusPlanListItem }
  | { ok: false; error: string };
export type LevelBonusPlanDeleteResponse =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type LevelBonusPlanDetailItem = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  structure: LevelBonusPlanStructureInput;
};
export type LevelBonusPlanDetailResponse =
  | { ok: true; item: LevelBonusPlanDetailItem }
  | { ok: false; error: string };
