// src/app/admin/mining/dftPayouts/view/DftPayoutsView.tsx
"use client";

import type {
  DftPayoutRow,
  DftPayoutQuery,
  DftPayoutsMeta,
} from "../types/dftPayouts";

export interface DftPayoutsViewProps {
  items: DftPayoutRow[];
  meta: DftPayoutsMeta | null;
  loading: boolean;
  error: string | null;
  query: DftPayoutQuery;

  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setUserId: (userId: string) => void;
  setUsername: (username: string) => void; // ← 추가
  setSearch: (q: string) => void;
  setDateFrom: (iso: string) => void;
  setDateTo: (iso: string) => void;
  setHasMiningPayout: (v: "yes" | "no" | "all") => void;
  setSort: (v: DftPayoutQuery["sort"]) => void;
  reload: () => void;
}

const fmt = (n: number): string =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(n);

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function DftPayoutsView(props: DftPayoutsViewProps) {
  const {
    items,
    meta,
    loading,
    error,
    query,
    setPage,
    setUserId,
    setUsername,
    setSearch,
    setDateFrom,
    setDateTo,
    setHasMiningPayout,
    setSort,
    reload,
  } = props;

  const totalPages = meta
    ? Math.max(1, Math.ceil(meta.total / meta.pageSize))
    : 1;
  const totalDFT = meta ? fmt(meta.sumAmountDFT) : "0";

  return (
    <div className="p-6">
      {/* 검색 폼 */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="form-control">
          <label className="label">
            <span className="label-text">User ID</span>
          </label>
          <input
            className="input input-bordered w-64"
            placeholder="userId"
            value={query.userId ?? ""}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Username</span>
          </label>
          <input
            className="input input-bordered w-56"
            placeholder="username"
            value={query.username ?? ""}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Search (name/note)</span>
          </label>
          <input
            className="input input-bordered w-64"
            placeholder="keyword"
            value={query.search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">From</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={(query.dateFrom ?? "").slice(0, 10)}
            onChange={(e) =>
              setDateFrom(
                e.target.value ? `${e.target.value}T00:00:00.000Z` : ""
              )
            }
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">To</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={(query.dateTo ?? "").slice(0, 10)}
            onChange={(e) =>
              setDateTo(e.target.value ? `${e.target.value}T23:59:59.999Z` : "")
            }
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Has MiningPayout</span>
          </label>
          <select
            className="select select-bordered w-40"
            value={query.hasMiningPayout ?? "all"}
            onChange={(e) =>
              setHasMiningPayout(e.target.value as "yes" | "no" | "all")
            }
          >
            <option value="all">All</option>
            <option value="yes">Linked</option>
            <option value="no">Unlinked</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Sort</span>
          </label>
          <select
            className="select select-bordered w-56"
            value={query.sort ?? "createdAt_desc"}
            onChange={(e) => setSort(e.target.value as DftPayoutQuery["sort"])}
          >
            <option value="createdAt_desc">CreatedAt ↓</option>
            <option value="createdAt_asc">CreatedAt ↑</option>
            <option value="amount_desc">Amount ↓</option>
            <option value="amount_asc">Amount ↑</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={reload} disabled={loading}>
          {loading ? <span className="loading loading-spinner" /> : "Reload"}
        </button>
      </div>

      {/* 합계 카드: 필터(특히 username) 반영된 총 지급 DFT */}
      <div className="mb-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total Paid DFT (Filtered)</div>
            <div className="stat-value text-primary">{totalDFT}</div>
            <div className="stat-desc">
              {query.username ? `username="${query.username}"` : "all users"}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Username</th>
              <th>Name</th>
              <th>Amount(DFT)</th>
              <th>MiningPayout</th>
              <th>Note</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs">{r.id}</td>
                <td className="font-mono text-xs">{r.userId}</td>
                <td className="font-mono text-xs">{r.username ?? ""}</td>
                <td>{r.name}</td>
                <td>{fmt(r.amountDFT)}</td>
                <td>
                  {r.miningPayoutId ? (
                    <span className="badge badge-success">
                      {r.miningPayoutId}
                    </span>
                  ) : (
                    <span className="badge">—</span>
                  )}
                </td>
                <td className="max-w-xs truncate">{r.note ?? ""}</td>
                <td>{formatDate(r.createdAt)}</td>
              </tr>
            ))}
            {items.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-sm text-base-content/60"
                >
                  데이터가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="join">
          <button
            className="btn join-item"
            disabled={query.page <= 1 || loading}
            onClick={() => setPage(query.page - 1)}
          >
            «
          </button>
          <button className="btn join-item">
            {meta ? `${query.page} / ${totalPages}` : String(query.page)}
          </button>
          <button
            className="btn join-item"
            disabled={meta ? query.page >= totalPages || loading : true}
            onClick={() => setPage(query.page + 1)}
          >
            »
          </button>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Page size</span>
          </label>
          <select
            className="select select-bordered"
            value={query.pageSize}
            onChange={(e) => props.setPageSize(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  );
}
