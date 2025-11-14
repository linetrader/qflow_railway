// src/app/admin/boards/announcements/view/AnnouncementsView.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useAnnouncementsList } from "../hooks/useAnnouncementsList";
import { useAnnouncementDetail } from "../hooks/useAnnouncementDetail";
import type { AdminPostListItem } from "../types";

type DeleteResult =
  | { ok: true; data: { deletedCount: number } }
  | { ok: false; error: string };

async function jsonFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      `HTTP ${res.status} ${res.statusText} — non-JSON: ${text.slice(0, 300)}`
    );
  }
  const data = (await res.json()) as unknown;
  return data as T;
}

export default function AnnouncementsListView() {
  const { list, loading, error, refresh } = useAnnouncementsList();
  const {
    detail,
    loading: loadingDetail,
    error: errorDetail,
    load: loadDetail,
    clear: clearDetail,
  } = useAnnouncementDetail();

  // 선택 상태
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const onToggleOne = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const allIds = useMemo(() => list.map((r) => r.id), [list]);
  const allSelected = useMemo(
    () => allIds.length > 0 && allIds.every((id) => selected.has(id)),
    [allIds, selected]
  );
  const hasSelection = selected.size > 0;

  const onToggleAll = useCallback(
    (checked: boolean) => {
      if (checked) setSelected(new Set(allIds));
      else setSelected(new Set());
    },
    [allIds]
  );

  const onRowClick = (row: AdminPostListItem) => {
    void loadDetail(row.id);
  };

  const onDeleteSelected = useCallback(async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const ask = window.confirm(`${ids.length}개의 게시글을 삭제할까요?`);
    if (!ask) return;
    try {
      const result = await jsonFetch<DeleteResult>(
        "/api/admin/boards/announcements",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        }
      );
      if (!result.ok) {
        alert(`[삭제 실패] ${result.error}`);
        return;
      }
      // 성공
      setSelected(new Set());
      await refresh();
      // 상세에서 보고 있던 글이 삭제되었으면 상세 비우기
      if (detail && ids.includes(detail.id)) clearDetail();
    } catch (e) {
      alert(e instanceof Error ? e.message : "unknown error");
    }
  }, [selected, detail, clearDetail, refresh]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 헤더 + 액션 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">공지 게시판</h1>
          <p className="text-sm opacity-70 mt-1">제목 기준 목록</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm" onClick={refresh} disabled={loading}>
            새로고침
          </button>
          <button
            className="btn btn-error btn-sm"
            onClick={onDeleteSelected}
            disabled={!hasSelection}
            title="선택 삭제"
          >
            선택 삭제
          </button>
          <Link
            href="/admin/boards/announcements/new"
            className="btn btn-primary btn-sm"
          >
            글쓰기
          </Link>
        </div>
      </div>

      {/* 목록 섹션 */}
      {error ? (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      ) : null}

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      aria-label="전체 선택"
                      checked={allSelected}
                      onChange={(e) => onToggleAll(e.currentTarget.checked)}
                    />
                  </th>
                  <th>제목</th>
                  <th>발행</th>
                  <th>작성</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const checked = selected.has(row.id);
                  return (
                    <tr key={row.id} className="hover">
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={checked}
                          onChange={(e) =>
                            onToggleOne(row.id, e.currentTarget.checked)
                          }
                        />
                      </td>
                      <td
                        className="font-medium cursor-pointer"
                        onClick={() => onRowClick(row)}
                      >
                        {row.title}
                      </td>
                      <td>{row.isPublished ? "Y" : "N"}</td>
                      <td>{new Date(row.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading ? <div className="mt-2 text-sm">불러오는 중…</div> : null}
            {list.length === 0 && !loading ? (
              <div className="mt-2 text-sm opacity-70">데이터가 없습니다.</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 게시글 보기 섹션 */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">게시글 보기</h2>
          {detail ? (
            <button className="btn btn-ghost btn-sm" onClick={clearDetail}>
              닫기
            </button>
          ) : null}
        </div>

        {loadingDetail ? (
          <div className="alert">
            <span>불러오는 중…</span>
          </div>
        ) : null}
        {errorDetail ? (
          <div className="alert alert-error">
            <span>{errorDetail}</span>
          </div>
        ) : null}

        {detail ? (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="mb-2">
                <div className="badge mr-2">{detail.visibility}</div>
                <div className="badge">
                  {detail.isPublished ? "발행" : "미발행"}
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">{detail.title}</h3>
              <div className="text-xs opacity-70 mb-4">
                작성: {new Date(detail.createdAt).toLocaleString()}
                {detail.publishedAt
                  ? ` · 발행: ${new Date(detail.publishedAt).toLocaleString()}`
                  : ""}
              </div>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: detail.bodyHtml ?? "" }}
              />
              {detail.bodyRaw ? (
                <details className="mt-4">
                  <summary className="cursor-pointer">
                    원문(bodyRaw) 보기
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs opacity-80">
                    {detail.bodyRaw}
                  </pre>
                </details>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-70">
            행을 클릭하면 게시글이 여기에 표시됩니다.
          </div>
        )}
      </div>
    </div>
  );
}
