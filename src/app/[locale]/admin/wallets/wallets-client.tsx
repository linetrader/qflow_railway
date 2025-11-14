// src/app/admin/wallets/wallets-client.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useQS } from "@/app/[locale]/admin/lib/useQS";
import { useDebouncedValue } from "@/app/[locale]/admin/lib/useDebouncedValue";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import { isAbortError } from "../lib/fetchWithRetry";
import { useToast, HistoryTable } from "@/components/ui";
import { Pagination } from "@/components/ui/Navigation/Pagination";

/** ---------- Types ---------- */
type WalletRow = {
  id: string;
  username: string;
  email: string;
  name: string;
  level: number;
  countryCode: string | null;
  createdAt: string;
  hasWallet: boolean;
  walletId: string | null;
  txCount: number;
  lastTxAt: string | null;
};

type ApiResp = {
  page: number;
  size: number;
  total: number;
  items: WalletRow[];
};

/** ---------- Constants ---------- */
const SORT_OPTIONS = [
  { label: "최근 생성 ↓", value: "createdAt:desc" },
  { label: "최근 생성 ↑", value: "createdAt:asc" },
  { label: "아이디 ↑", value: "username:asc" },
  { label: "아이디 ↓", value: "username:desc" },
  { label: "이름 ↑", value: "name:asc" },
  { label: "이름 ↓", value: "name:desc" },
  { label: "이메일 ↑", value: "email:asc" },
  { label: "이메일 ↓", value: "email:desc" },
  { label: "레벨 ↓", value: "level:desc" },
  { label: "레벨 ↑", value: "level:asc" },
] as const;

const PAGE_SIZES = [10, 20, 50, 100, 200] as const;

/** ---------- Local view components (daisyUI) ---------- */
function AlertError(props: { message: string }) {
  return (
    <div role="alert" className="alert alert-error">
      <span className="font-semibold">오류</span>
      <span className="truncate">{props.message}</span>
    </div>
  );
}

function AlertLoading(props: { text: string }) {
  return (
    <div role="status" className="alert">
      <span className="loading loading-spinner mr-2" />
      {props.text}
    </div>
  );
}

/** ---------- Page ---------- */
export default function WalletsClient() {
  const { toast } = useToast();
  const { searchParams, setParams } = useQS();

  // QS → 상태
  const page = useMemo(
    () => Math.max(1, Number(searchParams?.get("page") ?? 1)),
    [searchParams]
  );
  const pageSize = useMemo(() => {
    const n = Number(searchParams?.get("size") ?? 20);
    return (PAGE_SIZES as readonly number[]).includes(n) ? n : 20;
  }, [searchParams]);
  const sort = searchParams?.get("sort") ?? "createdAt:desc";
  const qRaw = searchParams?.get("q") ?? "";

  const [pendingQ, setPendingQ] = useState<string>(qRaw);
  const q = useDebouncedValue(pendingQ, 400);

  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 검색어 변경 → QS 반영(페이지 1로)
  useEffect(() => {
    setParams({ q: q || null, page: 1, size: pageSize, sort });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // page/size/sort 변경 시 QS 동기화
  useEffect(() => {
    setParams({ page, size: pageSize, sort, q: q || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sort]);

  // 데이터 조회(취소 가능)
  const ctrlRef = useRef<AbortController | null>(null);
  useEffect(() => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          size: String(pageSize),
          sort,
        });
        if (q) qs.set("q", q);

        const json = await fetchJson<ApiResp>(
          `/api/admin/wallets?${qs.toString()}`,
          {
            signal: ctrl.signal,
            cache: "no-store",
          }
        );
        setData(json);
      } catch (e: unknown) {
        if (isAbortError(e)) return;
        const msg = e instanceof Error ? e.message : "UNKNOWN_ERROR";
        setError(msg);
        setData(null);
        toast({ title: "조회 실패", description: msg, variant: "error" });
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [page, pageSize, sort, q, toast]);

  const onPageChange = (p: number) => setParams({ page: p });
  const onPageSizeChange = (s: number) => setParams({ size: s, page: 1 });

  /** ----- HistoryTable 변환용 Head/Rows ----- */
  const head: readonly string[] = [
    "아이디",
    "이름",
    "이메일",
    "레벨",
    "국가",
    "지갑여부",
    "최근 트랜잭션",
    "상세",
  ] as const;

  const rows: ReadonlyArray<readonly string[]> = data?.items?.length
    ? data.items.map((u) => [
        u.username,
        u.name ?? "",
        u.email ?? "",
        String(u.level ?? ""),
        u.countryCode ?? "-",
        u.hasWallet ? "보유" : "없음",
        u.lastTxAt ? new Date(u.lastTxAt).toLocaleString() : "-",
        u.id, // 상세 링크에서 사용
      ])
    : [];

  const emptyLabel =
    loading && !data
      ? "불러오는 중…"
      : error && !data
      ? `오류: ${error}`
      : "결과 없음";

  return (
    <div className="space-y-4" data-theme="">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">지갑 목록</h1>
          {data ? (
            <p className="text-sm text-base-content/60">
              총 {data.total.toLocaleString()}건
            </p>
          ) : null}
        </div>
        <Link href="/admin/wallets/pay-usdt" className="btn btn-outline">
          테스트 테더 넣기
        </Link>
      </div>

      {/* 상단 컨트롤 바 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex flex-wrap items-end gap-3">
            <label className="form-control w-64">
              <span className="label-text">검색</span>
              <input
                name="q"
                className="input input-bordered"
                placeholder="아이디/이름/이메일/추천코드"
                aria-label="검색"
                value={pendingQ}
                onChange={(e) => setPendingQ(e.target.value)}
              />
            </label>

            <label className="form-control w-56">
              <span className="label-text">정렬</span>
              <select
                name="sort"
                className="select select-bordered"
                aria-label="정렬"
                value={sort}
                onChange={(e) => setParams({ sort: e.target.value, page: 1 })}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control w-40">
              <span className="label-text">페이지 크기</span>
              <select
                name="size"
                className="select select-bordered"
                aria-label="페이지 크기"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}개씩
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* 데이터 테이블 (HistoryTable 적용) */}
      <div className="card bg-base-100 shadow">
        <div className="card-body gap-3">
          {loading && !data ? <AlertLoading text="불러오는 중…" /> : null}
          {error && !data ? <AlertError message={error} /> : null}

          <div className="overflow-x-auto">
            <HistoryTable
              head={head}
              rows={rows}
              emptyLabel={emptyLabel}
              className=""
              tableClassName="table table-sm w-full"
              showIndex={false}
              colAlign={[
                "left",
                "left",
                "left",
                "right",
                "left",
                "left",
                "left",
                "left",
              ]}
              minColWidthPx={120}
              cellRender={(rowIdx, colIdx, cell) => {
                // 레벨 숫자 정렬
                if (colIdx === 3) {
                  return <span className="tabular-nums">{cell}</span>;
                }
                // 최근 트랜잭션: 작은 글씨 + 줄바꿈 방지
                if (colIdx === 6) {
                  return (
                    <span className="whitespace-nowrap text-xs text-base-content/70">
                      {cell}
                    </span>
                  );
                }
                // 상세 링크
                if (colIdx === 7) {
                  const id = cell;
                  return (
                    <Link
                      href={`/admin/wallets/${id}`}
                      className="btn btn-ghost btn-xs normal-case"
                    >
                      보기
                    </Link>
                  );
                }
                return cell;
              }}
            />
          </div>

          {/* 공용 Pagination UI */}
          {data ? (
            <div className="p-3">
              <Pagination
                total={data.total}
                page={data.page}
                pageSize={data.size}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
