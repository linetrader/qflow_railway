// src/types/admin/packages/user/index.ts
export type UserPackageRow = {
  username: string;
  level: number;
  countryCode: string | null;
  packageId: string;
  packageName: string;
  quantity: number; // ← 백엔드에서 숫자로 정규화
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
};

export type UserPackageListResponse = {
  total: number;
  items: UserPackageRow[];
  page: number; // ← 필수
  pageSize: number; // ← 필수
};

export type UserPackageFilters = {
  username?: string;
  countryCode?: string;
  levelMin?: number;
  levelMax?: number;
  packageId?: string;
  packageNameContains?: string;
  createdFrom?: string; // 'YYYY-MM-DD'
  createdTo?: string; // 'YYYY-MM-DD'
};

export type UserPackageSort = {
  key: "username" | "level" | "quantity" | "createdAt" | "updatedAt";
  order: "asc" | "desc";
};

export type PageParams = {
  page: number;
  pageSize: number;
};
