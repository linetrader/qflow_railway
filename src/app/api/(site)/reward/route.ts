// src/app/api/(site)/reward/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/request-user";
import type {
  ApiCursorAll,
  ApiCursorSingle,
  FilterMode,
  NextCursor,
  RewardsPageSuccess,
  RewardsPageError,
  Totals as TotalsFront,
  UnifiedRow,
} from "@/types/reward";

// ========== 라우터 전용 응답 타입 ==========
type RouteSuccessPayload = { ok: true } & RewardsPageSuccess;
type RouteErrorPayload = RewardsPageError;

// ========== 내부 유틸 타입 ==========
type KeysetCursorSingle = { ts?: string | null; id?: string | null };
type KeysetCursorAll = {
  usdtTs?: string | null;
  usdtId?: string | null;
  dftTs?: string | null;
  dftId?: string | null;
  centerTs?: string | null;
  centerId?: string | null;
  levelTs?: string | null; // ★ UserLevelBonus
  levelId?: string | null; // ★ UserLevelBonus
};

type UsdtOut = {
  id: string; // "USDT:<id>" | "USDT:CEN:<id>" | "USDT:LVL:<id>"
  ts: number;
  date: string; // "YYYY-MM-DD HH:mm"
  type: "USDT";
  title: string; // "[USDT] REFERRER" | "[USDT] CENTER" | "[USDT] LEVEL BONUS"
  subtitle: string;
  amount: number;
  unit: "USDT";
  status?: string; // REFERRER/CENTER만 사용(레벨보너스는 생략)
  _raw_id: string;
  _raw_ts: Date;
};

type DftOut = {
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

type MergedOut = UsdtOut | DftOut;

type TotalsPayload = {
  // 레퍼럴 + 센터 + 레벨 보너스 합산
  totalUSDT: number;
  dftSummary: {
    totalDFT: number;
    todayDFT: number;
    yesterdayDFT: number;
    calculatedAt: string;
  };
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ========== 유틸 ==========
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function fmtDate(d: Date): string {
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
}
function toNum(v: unknown): number {
  const n = Number(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}
/** keyset (createdAt desc, id desc) */
function ltCursor(
  tsIso?: string | null,
  id?: string | null
): { OR?: Array<Record<string, unknown>> } {
  if (!tsIso || !id) return {};
  const ts = new Date(tsIso);
  if (Number.isNaN(ts.getTime())) return {};
  return {
    OR: [
      { createdAt: { lt: ts } },
      { AND: [{ createdAt: ts }, { id: { lt: id } }] },
    ],
  };
}
function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
function encCursor(p: KeysetCursorSingle | KeysetCursorAll): string {
  return JSON.stringify(p);
}
function decSingle(s?: string | null): KeysetCursorSingle | null {
  if (!s) return null;
  const o = safeJsonParse<Partial<KeysetCursorSingle>>(s);
  if (!o) return null;
  return { ts: o.ts ?? null, id: o.id ?? null };
}
function decAll(s?: string | null): KeysetCursorAll | null {
  if (!s) return null;
  const o = safeJsonParse<Partial<KeysetCursorAll>>(s);
  if (!o) return null;
  return {
    usdtTs: o.usdtTs ?? null,
    usdtId: o.usdtId ?? null,
    dftTs: o.dftTs ?? null,
    dftId: o.dftId ?? null,
    centerTs: o.centerTs ?? null,
    centerId: o.centerId ?? null,
    levelTs: o.levelTs ?? null,
    levelId: o.levelId ?? null,
  };
}

// ========== 쿼리 파싱 ==========
function parseQuery(url: string): {
  mode: FilterMode;
  limit: number;
  keysetSingle: KeysetCursorSingle | null;
  keysetAll: KeysetCursorAll | null;
} {
  const { searchParams } = new URL(url);

  const modeParam = (searchParams.get("filter") || "ALL").toUpperCase();
  const mode: FilterMode =
    modeParam === "USDT" || modeParam === "DFT"
      ? (modeParam as FilterMode)
      : "ALL";

  const limitRaw = Number(searchParams.get("limit") || 30);
  const limit = Math.max(
    1,
    Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 30)
  );

  const cursorRaw = searchParams.get("cursor");
  let keysetSingle: KeysetCursorSingle | null = null;
  let keysetAll: KeysetCursorAll | null = null;

  if (cursorRaw) {
    const c = safeJsonParse<ApiCursorSingle | ApiCursorAll>(cursorRaw);
    if (c && "kind" in c && "cursor" in c) {
      if (c.kind === "SINGLE") keysetSingle = decSingle(c.cursor);
      else if (c.kind === "ALL") keysetAll = decAll(c.cursor);
    }
  }

  // 구버전 호환(옵션)
  if (!keysetSingle && !keysetAll) {
    const legacy = {
      cursorTs: searchParams.get("cursorTs"),
      cursorId: searchParams.get("cursorId"),
      cursorUsdtTs: searchParams.get("cursorUsdtTs"),
      cursorUsdtId: searchParams.get("cursorUsdtId"),
      cursorDftTs: searchParams.get("cursorDftTs"),
      cursorDftId: searchParams.get("cursorDftId"),
      cursorCenterTs: searchParams.get("cursorCenterTs"),
      cursorCenterId: searchParams.get("cursorCenterId"),
      cursorLevelTs: searchParams.get("cursorLevelTs"),
      cursorLevelId: searchParams.get("cursorLevelId"),
    };
    if (
      mode === "ALL" &&
      (legacy.cursorUsdtTs ||
        legacy.cursorUsdtId ||
        legacy.cursorDftTs ||
        legacy.cursorDftId ||
        legacy.cursorCenterTs ||
        legacy.cursorCenterId ||
        legacy.cursorLevelTs ||
        legacy.cursorLevelId)
    ) {
      keysetAll = {
        usdtTs: legacy.cursorUsdtTs ?? null,
        usdtId: legacy.cursorUsdtId ?? null,
        dftTs: legacy.cursorDftTs ?? null,
        dftId: legacy.cursorDftId ?? null,
        centerTs: legacy.cursorCenterTs ?? null,
        centerId: legacy.cursorCenterId ?? null,
        levelTs: legacy.cursorLevelTs ?? null,
        levelId: legacy.cursorLevelId ?? null,
      };
    } else if (legacy.cursorTs || legacy.cursorId) {
      keysetSingle = {
        ts: legacy.cursorTs ?? null,
        id: legacy.cursorId ?? null,
      };
    }
  }

  return { mode, limit, keysetSingle, keysetAll };
}

// ========== 라우터 ==========
export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json<RouteErrorPayload>(
        { ok: false, code: "UNAUTH", message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { mode, limit, keysetSingle, keysetAll } = parseQuery(req.url);

    // -------- Totals --------
    const [rcSum, ccSum, lbSum, rs] = await Promise.all([
      prisma.referralCommission.aggregate({
        _sum: { commissionUSDT: true },
        where: { beneficiaryUserId: userId },
      }),
      prisma.centerCommission.aggregate({
        _sum: { amount: true },
        where: { centerUserId: userId },
      }),
      prisma.userLevelBonus.aggregate({
        _sum: { amountUSD: true },
        where: { userId },
      }),
      prisma.userRewardSummary.findUnique({
        where: { userId },
        select: {
          totalDFT: true,
          todayDFT: true,
          yesterdayDFT: true,
          calculatedAt: true,
        },
      }),
    ]);

    const totals: TotalsPayload = {
      totalUSDT:
        toNum(rcSum._sum.commissionUSDT) +
        toNum(ccSum._sum.amount) +
        toNum(lbSum._sum.amountUSD),
      dftSummary: {
        totalDFT: rs ? toNum(rs.totalDFT) : 0,
        todayDFT: rs ? toNum(rs.todayDFT) : 0,
        yesterdayDFT: rs ? toNum(rs.yesterdayDFT) : 0,
        calculatedAt: rs ? fmtDate(rs.calculatedAt) : fmtDate(new Date()),
      },
    };

    // -------- helpers --------
    // 레퍼럴 커미션 → USDT
    const fetchUsdtReferral = async (
      ts?: string | null,
      id?: string | null,
      take = limit
    ): Promise<UsdtOut[]> => {
      const rows = await prisma.referralCommission.findMany({
        where: { beneficiaryUserId: userId, ...ltCursor(ts, id) },
        include: {
          buyer: { select: { id: true, username: true } },
          Package: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
      });
      return rows.map((r) => {
        const pkg = r.Package?.name ?? r.packageId;
        const level = `L${r.level}`;
        const percent = `${Number(r.percent)}%`;
        const base = `${toNum(r.baseAmount)} USDT`;
        const status = String(r.status);
        return {
          id: `USDT:${r.id}`,
          ts: r.createdAt.getTime(),
          date: fmtDate(r.createdAt),
          type: "USDT" as const,
          title: "[USDT] REFERRER",
          subtitle: `${level} · ${pkg} · ${percent} of ${base} · ${status}`,
          amount: toNum(r.commissionUSDT),
          unit: "USDT" as const,
          status,
          _raw_id: r.id,
          _raw_ts: r.createdAt,
        };
      });
    };

    // 센터 커미션 → USDT
    const fetchUsdtCenter = async (
      ts?: string | null,
      id?: string | null,
      take = limit
    ): Promise<UsdtOut[]> => {
      const rows = await prisma.centerCommission.findMany({
        where: { centerUserId: userId, ...ltCursor(ts, id) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        select: {
          id: true,
          percent: true,
          baseAmount: true,
          amount: true,
          status: true,
          memo: true,
          createdAt: true,
        },
      });
      return rows.map((r) => {
        const percent = `${Number(r.percent)}%`;
        const base = `${toNum(r.baseAmount)} USDT`;
        const status = String(r.status);
        const memo = r.memo ? ` · ${r.memo}` : "";
        return {
          id: `USDT:CEN:${r.id}`,
          ts: r.createdAt.getTime(),
          date: fmtDate(r.createdAt),
          type: "USDT" as const,
          title: "[USDT] CENTER",
          subtitle: `${percent} of ${base} · ${status}${memo}`,
          amount: toNum(r.amount),
          unit: "USDT" as const,
          status,
          _raw_id: r.id,
          _raw_ts: r.createdAt,
        };
      });
    };

    // ★ 레벨 보너스(UserLevelBonus) → USDT
    const fetchUsdtLevel = async (
      ts?: string | null,
      id?: string | null,
      take = limit
    ): Promise<UsdtOut[]> => {
      const rows = await prisma.userLevelBonus.findMany({
        where: { userId, ...ltCursor(ts, id) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        select: {
          id: true,
          capLevel: true,
          amountUSD: true,
          paidAt: true,
          sourceHistoryId: true,
        },
      });
      return rows.map((r) => ({
        id: `USDT:LVL:${r.id}`,
        ts: r.paidAt.getTime(),
        date: fmtDate(r.paidAt),
        type: "USDT" as const,
        title: "[USDT] LEVEL BONUS",
        subtitle: `L${r.capLevel} · hist=${r.sourceHistoryId}`,
        amount: toNum(r.amountUSD),
        unit: "USDT" as const,
        _raw_id: r.id,
        _raw_ts: r.paidAt,
      }));
    };

    const fetchDft = async (
      ts?: string | null,
      id?: string | null,
      take = limit
    ): Promise<DftOut[]> => {
      const rows = await prisma.userRewardHistory.findMany({
        where: { userId, ...ltCursor(ts, id) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        select: {
          id: true,
          name: true,
          amountDFT: true,
          note: true,
          createdAt: true,
        },
      });
      return rows.map((h) => ({
        id: `DFT:${h.id}`,
        ts: h.createdAt.getTime(),
        date: fmtDate(h.createdAt),
        type: "DFT" as const,
        title: h.name,
        subtitle: h.note ?? "리워드 적립",
        amount: toNum(h.amountDFT),
        unit: "DFT" as const,
        _raw_id: String(h.id),
        _raw_ts: h.createdAt,
      }));
    };

    // -------- mode 분기 --------
    if (mode === "USDT") {
      // 기존 호환: USDT 모드는 "레퍼럴 USDT"만 반환(필요 시 fetchUsdtLevel 병합 가능)
      const c = keysetSingle;
      const usdt = await fetchUsdtReferral(
        c?.ts ?? null,
        c?.id ?? null,
        limit + 1
      );
      const page = usdt.slice(0, limit);
      const last = page[page.length - 1];
      const hasMore = usdt.length > limit;

      const items: UnifiedRow[] = page.map((r) => ({
        id: r.id,
        date: r.date,
        amount: r.amount,
        unit: r.unit,
        title: r.title,
        subtitle: r.subtitle,
        type: "USDT",
        status: (r.status as "PENDING" | "COMPLETED" | "REJECTED") ?? undefined,
      }));

      const nextCursor: NextCursor =
        hasMore && last
          ? ({
              kind: "SINGLE",
              cursor: encCursor({
                ts: last._raw_ts.toISOString(),
                id: last._raw_id,
              }),
            } as ApiCursorSingle)
          : null;

      return NextResponse.json<RouteSuccessPayload>({
        ok: true,
        mode,
        items,
        nextCursor,
        totals: totals as unknown as TotalsFront,
      });
    }

    if (mode === "DFT") {
      const c = keysetSingle;
      const dft = await fetchDft(c?.ts ?? null, c?.id ?? null, limit + 1);
      const page = dft.slice(0, limit);
      const last = page[page.length - 1];
      const hasMore = dft.length > limit;

      const items: UnifiedRow[] = page.map((r) => ({
        id: r.id,
        date: r.date,
        amount: r.amount,
        unit: r.unit,
        title: r.title,
        subtitle: r.subtitle,
        type: "DFT",
      }));

      const nextCursor: NextCursor =
        hasMore && last
          ? ({
              kind: "SINGLE",
              cursor: encCursor({
                ts: last._raw_ts.toISOString(),
                id: last._raw_id,
              }),
            } as ApiCursorSingle)
          : null;

      return NextResponse.json<RouteSuccessPayload>({
        ok: true,
        mode,
        items,
        nextCursor,
        totals: totals as unknown as TotalsFront,
      });
    }

    // mode === "ALL"  → 4원 합병: USDT(레퍼럴) + USDT(센터) + USDT(레벨보너스) + DFT
    const cAll = keysetAll;
    const [usdtRef, usdtCenter, usdtLevel, dft] = await Promise.all([
      fetchUsdtReferral(cAll?.usdtTs ?? null, cAll?.usdtId ?? null, limit),
      fetchUsdtCenter(cAll?.centerTs ?? null, cAll?.centerId ?? null, limit),
      fetchUsdtLevel(cAll?.levelTs ?? null, cAll?.levelId ?? null, limit),
      fetchDft(cAll?.dftTs ?? null, cAll?.dftId ?? null, limit),
    ]);

    const merged: MergedOut[] = [];
    let i = 0; // ref
    let j = 0; // center
    let l = 0; // level
    let k = 0; // dft

    const newer = (
      x: { ts: number; _raw_id: string },
      y?: { ts: number; _raw_id: string } | null
    ): boolean =>
      !!x &&
      (!y ||
        x.ts > y.ts ||
        (x.ts === y.ts && String(x._raw_id) > String(y._raw_id)));

    while (
      merged.length < limit &&
      (i < usdtRef.length ||
        j < usdtCenter.length ||
        l < usdtLevel.length ||
        k < dft.length)
    ) {
      const a = usdtRef[i];
      const b = usdtCenter[j];
      const c = usdtLevel[l];
      const d = dft[k];

      if (a && newer(a, b) && newer(a, c) && newer(a, d)) {
        merged.push(a);
        i++;
        continue;
      }
      if (b && newer(b, a) && newer(b, c) && newer(b, d)) {
        merged.push(b);
        j++;
        continue;
      }
      if (c && newer(c, a) && newer(c, b) && newer(c, d)) {
        merged.push(c);
        l++;
        continue;
      }
      if (d) {
        merged.push(d);
        k++;
        continue;
      }
    }

    const lastRef = i > 0 ? usdtRef[i - 1] : null;
    const lastCen = j > 0 ? usdtCenter[j - 1] : null;
    const lastLvl = l > 0 ? usdtLevel[l - 1] : null;
    const lastDft = k > 0 ? dft[k - 1] : null;

    const consumedAny =
      merged.length > 0 && (lastRef || lastCen || lastLvl || lastDft);
    const nextCursorAll: NextCursor = consumedAny
      ? ({
          kind: "ALL",
          cursor: encCursor({
            usdtTs: lastRef
              ? lastRef._raw_ts.toISOString()
              : cAll?.usdtTs ?? null,
            usdtId: lastRef ? lastRef._raw_id : cAll?.usdtId ?? null,
            centerTs: lastCen
              ? lastCen._raw_ts.toISOString()
              : cAll?.centerTs ?? null,
            centerId: lastCen ? lastCen._raw_id : cAll?.centerId ?? null,
            levelTs: lastLvl
              ? lastLvl._raw_ts.toISOString()
              : cAll?.levelTs ?? null,
            levelId: lastLvl ? lastLvl._raw_id : cAll?.levelId ?? null,
            dftTs: lastDft
              ? lastDft._raw_ts.toISOString()
              : cAll?.dftTs ?? null,
            dftId: lastDft ? lastDft._raw_id : cAll?.dftId ?? null,
          }),
        } as ApiCursorAll)
      : null;

    const items: UnifiedRow[] = merged.map((r) =>
      r.type === "USDT"
        ? {
            id: r.id,
            date: r.date,
            amount: r.amount,
            unit: "USDT",
            title: r.title,
            subtitle: r.subtitle,
            type: "USDT",
            status: (r as UsdtOut).status as
              | "PENDING"
              | "COMPLETED"
              | "REJECTED"
              | undefined,
          }
        : {
            id: r.id,
            date: r.date,
            amount: r.amount,
            unit: "DFT",
            title: r.title,
            subtitle: r.subtitle,
            type: "DFT",
          }
    );

    return NextResponse.json<RouteSuccessPayload>({
      ok: true,
      mode,
      items,
      nextCursor: nextCursorAll,
      totals: totals as unknown as TotalsFront,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("[/api/(site)/reward] GET error", e);
    return NextResponse.json<RouteErrorPayload>(
      { ok: false, code: "UNKNOWN", message },
      { status: 500 }
    );
  }
}
