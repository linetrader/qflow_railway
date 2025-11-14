// src/types/admin/packages-history.ts
export type PageParams = {
  page: number; // 1-based
  pageSize: number; // 1..200
};

export type PackageHistoryFilters = {
  username?: string;
  packageId?: string;
  packageNameContains?: string;
  quantityMin?: number;
  quantityMax?: number;
  unitPriceMin?: string; // Decimal 직렬화 문자열
  unitPriceMax?: string; // Decimal 직렬화 문자열
  totalPriceMin?: string; // Decimal 직렬화 문자열
  totalPriceMax?: string; // Decimal 직렬화 문자열
  createdFrom?: string; // ISO date
  createdTo?: string; // ISO date
};

export type PackageHistorySort = {
  key:
    | "createdAt"
    | "username"
    | "packageName"
    | "quantity"
    | "unitPrice"
    | "totalPrice";
  order: "asc" | "desc";
};

export type PackageHistoryRow = {
  id: string;
  createdAt: string; // ISO
  username: string;
  packageName: string;
  quantity: number;
  unitPrice: string; // Decimal 직렬화 문자열
  totalPrice: string; // Decimal 직렬화 문자열
};

export type PackageHistoryListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: PackageHistoryRow[];
};
