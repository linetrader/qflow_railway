// ──────────────────────────────────────────────────────────────────────────────
// File: /src/app/(site)/packages/types/index.ts
// ──────────────────────────────────────────────────────────────────────────────
export type ApiPackage = {
  id: string;
  name: string;
  price: number;
  dailyDftAmount?: number;
};

export type ApiHistoryItem = {
  id: string;
  kind: string;
  unitPrice: number;
  units: number;
  date: string; // ISO string
  status: "COMPLETED" | "PENDING";
};

export type PackageQtyMap = Record<string, string>; // key: package.id, numeric string

export type NextCursor = { ts?: string | null; id?: string | null } | null;

export type PackagesGetOk = {
  ok: true;
  packages?: ApiPackage[];
  history?: ApiHistoryItem[];
  usdtBalance?: number;
  qaiPrice?: number;
};

export type PackagesGetResp = PackagesGetOk | { ok: false; message?: string };

export type PurchasePostResp = { ok: boolean; message?: string };

/** API 응답 타입 (런타임 좁히기 전용) */
export type HistoryResp = {
  ok: boolean;
  history?: ApiHistoryItem[];
  nextCursor?: NextCursor;
  message?: string;
};

export type UsePurchaseHistoryResult = {
  rows: ApiHistoryItem[];
  total: number;
  nextCursor: NextCursor;
  loading: boolean;
  err: string | null;
  loadMore: () => Promise<void>;
};
