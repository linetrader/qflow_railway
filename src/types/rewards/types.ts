// src/types/rewards/types.ts

export type FilterMode = "ALL" | "USDT" | "DFT";

export type UnifiedRow = {
  id: string;
  ts: number;
  date: string;
  type: "USDT" | "DFT";
  title: string;
  subtitle?: string;
  amount: number;
  unit: "USDT" | "DFT";
  status?: "PENDING" | "ACCRUED" | "CANCELED" | string;
};

export type ApiCursorAll = {
  usdtTs?: string | null;
  usdtId?: string | null;
  dftTs?: string | null;
  dftId?: string | null;
} | null;

export type ApiCursorSingle = { ts?: string | null; id?: string | null } | null;

export type RewardsApiRes =
  | {
      ok: true;
      mode: FilterMode;
      items: UnifiedRow[];
      nextCursor: ApiCursorAll | ApiCursorSingle;
      totals: {
        totalUSDT: number;
        dftSummary: {
          totalDFT: number;
          todayDFT: number;
          yesterdayDFT: number;
          calculatedAt: string;
        };
      };
    }
  | { ok: false; code: string; message?: string };

// ✅ any 제거
export function isErr(
  x: RewardsApiRes
): x is { ok: false; code: string; message?: string } {
  return x.ok === false;
}

export function isCursorAll(
  c: ApiCursorAll | ApiCursorSingle | undefined | null
): c is ApiCursorAll {
  const v = c as Record<string, unknown> | null | undefined;
  return (
    !!v && ("usdtTs" in v || "usdtId" in v || "dftTs" in v || "dftId" in v)
  );
}

export function isCursorSingle(
  c: ApiCursorAll | ApiCursorSingle | undefined | null
): c is ApiCursorSingle {
  const v = c as Record<string, unknown> | null | undefined;
  return !!v && ("ts" in v || "id" in v) && !("usdtTs" in (v || {}));
}
