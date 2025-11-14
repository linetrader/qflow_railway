// src/app/admin/centers/types/admin-centers.ts

export type CenterUserBrief = {
  id: string;
  username: string;
  name: string;
  email: string;
};

export type CenterManagerItem = {
  id: string;
  user: CenterUserBrief;
  percent: string; // Decimal 직렬화
  isActive: boolean;
  effectiveFrom: string; // ISO
  effectiveTo: string | null; // ISO | null
  createdAt: string; // ISO
};

export type ListCentersResponse = { ok: true; data: CenterManagerItem[] };

export type SearchUserRow = CenterUserBrief & { isCenterManager: boolean };

export type SearchUsersResponse =
  | { ok: true; data: SearchUserRow[] }
  | { ok: false; code: string; message: string };

export type PostResult =
  | { ok: true }
  | { ok: false; code: string; message: string };
export type DeleteResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

// 내부 사용 폼 타입
export type RegisterPayload = {
  userId: string;
  percent: number;
  isActive: boolean;
};

export type DeletePayload = {
  userId: string;
};
