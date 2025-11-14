// src/app/admin/centers/view/CentersAdminView.tsx
"use client";

import { fmtDateISO, fmtDateTimeISO } from "../guard";
import type { CenterManagerItem, SearchUserRow } from "../types/admin-centers";

type Props = {
  centers: CenterManagerItem[];
  loadingList: boolean;

  query: string;
  searching: boolean;
  results: SearchUserRow[];
  selectedUser: SearchUserRow | null;
  percent: string;
  submitting: boolean;

  canSubmit: boolean;

  setQuery: (v: string) => void;
  setSelectedUser: (u: SearchUserRow) => void;
  setPercent: (v: string) => void;

  onSearch: () => Promise<void>;
  onRegister: () => Promise<void>;
  onDelete: (userId: string) => Promise<void>;

  percentInputRef: React.RefObject<HTMLInputElement | null>;
};

export default function CentersAdminView(props: Props) {
  const {
    centers,
    loadingList,
    query,
    searching,
    results,
    selectedUser,
    percent,
    submitting,
    canSubmit,
    setQuery,
    setSelectedUser,
    setPercent,
    onSearch,
    onRegister,
    onDelete,
    percentInputRef,
  } = props;

  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">센터장 관리</h1>
      </header>

      {/* 등록 섹션 */}
      <section className="card bg-base-100 shadow">
        <div className="card-body space-y-4">
          <h2 className="card-title">센터장 등록</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Username 검색</span>
              </label>
              <div className="join">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void onSearch();
                    }
                  }}
                  placeholder="username (부분검색)"
                  className="input input-bordered join-item"
                />
                <button
                  className="btn btn-primary join-item"
                  onClick={() => void onSearch()}
                  disabled={searching || !query.trim()}
                >
                  {searching ? "검색 중…" : "검색"}
                </button>
              </div>
              <label className="label">
                <span className="label-text-alt">최대 20건</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">선택된 사용자</span>
              </label>
              <input
                type="text"
                value={
                  selectedUser
                    ? `${selectedUser.username} (${selectedUser.name})`
                    : ""
                }
                readOnly
                placeholder="검색 결과에서 선택"
                className="input input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">수수료 퍼센트(%)</span>
              </label>
              <input
                ref={percentInputRef}
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="input input-bordered"
              />
              <label className="label">
                <span className="label-text-alt">
                  0 ~ 100 (소수점 둘째자리)
                </span>
              </label>
            </div>
          </div>

          {/* 검색 결과 */}
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>선택</th>
                  <th>Username</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>센터장 여부</th>
                </tr>
              </thead>
              <tbody>
                {results.map((u) => (
                  <tr
                    key={u.id}
                    className={selectedUser?.id === u.id ? "active" : ""}
                  >
                    <td>
                      <button
                        className="btn btn-sm"
                        disabled={u.isCenterManager}
                        onClick={() => setSelectedUser(u)}
                      >
                        {u.isCenterManager ? "이미 센터장" : "선택"}
                      </button>
                    </td>
                    <td>{u.username}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.isCenterManager ? "예" : "아니오"}</td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center text-base-content/60"
                    >
                      결과 없음
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              className="btn btn-primary"
              onClick={() => void onRegister()}
              disabled={!canSubmit || submitting}
            >
              {submitting ? "등록 중…" : "센터장 등록"}
            </button>
          </div>
        </div>
      </section>

      {/* 목록 섹션 */}
      <section className="card bg-base-100 shadow">
        <div className="card-body space-y-4">
          <h2 className="card-title">센터장 목록</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>등록일</th>
                  <th>Username</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>퍼센트(%)</th>
                  <th>활성</th>
                  <th>유효기간</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((c) => (
                  <tr key={c.id}>
                    <td>{fmtDateTimeISO(c.createdAt)}</td>
                    <td>{c.user.username}</td>
                    <td>{c.user.name}</td>
                    <td>{c.user.email}</td>
                    <td>{c.percent}</td>
                    <td>{c.isActive ? "예" : "아니오"}</td>
                    <td>
                      {fmtDateISO(c.effectiveFrom)} ~{" "}
                      {fmtDateISO(c.effectiveTo)}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-error"
                        onClick={() => void onDelete(c.user.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {centers.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center text-base-content/60"
                    >
                      {loadingList
                        ? "불러오는 중…"
                        : "센터장 데이터가 없습니다."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
