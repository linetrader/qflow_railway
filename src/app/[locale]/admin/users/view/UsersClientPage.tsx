// src/app/admin/users/components/UsersClientPage.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { okGuard, errGuard } from "../gaurd/deleteGuards";
import { isAbortError } from "../../lib/fetchWithRetry";
import { useToast } from "@/components/ui";
import { useUsersQuery } from "../hooks/useUsersQuery";

import { HeaderView } from "./HeaderView";
import { ControlsView } from "./ControlsView";
import { TableView } from "./TableView";
// import { PaginationView } from "./PaginationView"; // ⟵ 삭제

export default function UsersClientPage() {
  const {
    data,
    loading,
    error,
    page,
    pageSize,
    sort,
    pendingQ,
    setPendingQ,
    onPageChange,
    onPageSizeChange,
    onSortChange,
  } = useUsersQuery();

  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const itemsKey = `${page}-${pageSize}-${sort}-${pendingQ}-${
    data?.items?.length ?? 0
  }`;
  const prevKeyRef = useRef(itemsKey);
  if (prevKeyRef.current !== itemsKey) {
    prevKeyRef.current = itemsKey;
    setSelected(new Set());
  }

  const idsOnPage = useMemo(
    () => (data?.items ?? []).map((u) => u.id),
    [data?.items]
  );
  const allOnPageSelected =
    idsOnPage.length > 0 && idsOnPage.every((id) => selected.has(id));

  const toggleSelectAllOnPage = () => {
    const next = new Set(selected);
    if (allOnPageSelected) idsOnPage.forEach((id) => next.delete(id));
    else idsOnPage.forEach((id) => next.add(id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const [deleting, setDeleting] = useState(false);
  async function bulkDelete() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    if (
      !window.confirm(
        `선택한 ${ids.length}개 계정을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    setDeleting(true);
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 30_000);
    try {
      const res = await fetch("/api/admin/test-users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ ids }),
        signal: ac.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(errGuard(body) ? body.error : `HTTP_${res.status}`);
      if (!okGuard(body)) throw new Error("INVALID_RESPONSE");
      setSelected(new Set());
      toast({
        title: "삭제 완료",
        description: `${
          (body as { deleted: number }).deleted
        }개 삭제되었습니다.`,
      });
    } catch (e) {
      const msg = isAbortError(e)
        ? "NETWORK_TIMEOUT"
        : e instanceof Error
        ? e.message
        : "UNKNOWN_ERROR";
      toast({ title: "삭제 실패", description: msg, variant: "error" });
    } finally {
      clearTimeout(to);
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4" data-theme="">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <HeaderView
          title="유저 목록"
          subtitle={data ? `총 ${data.total.toLocaleString()}건` : undefined}
        />
        <div className="flex gap-2">
          <Link href="/admin/users/bulk-signup" className="btn btn-outline">
            테스트 회원 생성
          </Link>
          <button
            type="button"
            className={`btn ${
              selected.size > 0 ? "btn-error" : "btn-outline"
            } ${deleting ? "loading" : ""}`}
            onClick={bulkDelete}
            disabled={deleting || selected.size === 0 || loading}
          >
            {selected.size > 0 ? `선택 삭제 (${selected.size})` : "선택 삭제"}
          </button>
        </div>
      </div>

      {/* 컨트롤 */}
      <ControlsView
        pendingQ={pendingQ}
        setPendingQ={setPendingQ}
        sort={sort}
        pageSize={pageSize}
        onSortChange={onSortChange}
        onPageSizeChange={onPageSizeChange}
      />

      {/* 테이블 + 내부 페이지네이션 */}
      <TableView
        items={data?.items}
        loading={loading}
        error={error}
        selected={selected}
        toggleOne={toggleOne}
        allOnPageSelected={allOnPageSelected}
        toggleSelectAllOnPage={toggleSelectAllOnPage}
        // pagination props
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

      {/* PaginationView 제거됨 */}
    </div>
  );
}
