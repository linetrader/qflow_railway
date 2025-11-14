// src/app/admin/mining/dftPayouts/hooks/useDftPayouts.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ApiResponse,
  DftPayoutQuery,
  DftPayoutRow,
  DftPayoutsPayload,
  DftPayoutsMeta,
} from "../types/dftPayouts";
import { isApiOk, isDftPayoutsPayload } from "../gaurd/dftPayouts";
import { useToast } from "@/components/ui";

export interface UseDftPayoutsState {
  items: DftPayoutRow[];
  meta: DftPayoutsMeta | null;
  loading: boolean;
  error: string | null;
  query: DftPayoutQuery;
}

export interface UseDftPayoutsReturn extends UseDftPayoutsState {
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

const toQueryString = (q: DftPayoutQuery): string => {
  const params = new URLSearchParams();
  params.set("page", String(q.page));
  params.set("pageSize", String(q.pageSize));
  if (q.userId) params.set("userId", q.userId);
  if (q.username) params.set("username", q.username); // ← 추가
  if (q.search) params.set("search", q.search);
  if (q.dateFrom) params.set("dateFrom", q.dateFrom);
  if (q.dateTo) params.set("dateTo", q.dateTo);
  if (q.hasMiningPayout) params.set("hasMiningPayout", q.hasMiningPayout);
  if (q.sort) params.set("sort", q.sort);
  return params.toString();
};

export const useDftPayouts = (
  initial?: Partial<DftPayoutQuery>
): UseDftPayoutsReturn => {
  const { toast } = useToast();
  const [state, setState] = useState<UseDftPayoutsState>({
    items: [],
    meta: null,
    loading: false,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      hasMiningPayout: "all",
      sort: "createdAt_desc",
      ...initial,
    },
  });

  const fetchList = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const qs = toQueryString(state.query);
      const res = await fetch(`/api/admin/mining/dftPayouts?${qs}`, {
        credentials: "same-origin",
        cache: "no-store",
      });

      // 성공/실패 공히 JSON 응답을 가정 (서버는 항상 JSON 반환)
      const json: unknown = await res.json();

      if (isApiOk<DftPayoutsPayload>(json, isDftPayoutsPayload)) {
        const resp = json as ApiResponse<DftPayoutsPayload>;
        if (resp.ok) {
          setState((s) => ({
            ...s,
            items: resp.data.items,
            meta: resp.meta ?? null,
            loading: false,
          }));
          return;
        }
        const message = resp.message ?? "API 오류가 발생했습니다.";
        setState((s) => ({ ...s, error: message, loading: false }));
        toast({
          title: "불러오기 실패",
          description: message,
          variant: "error",
        });
        return;
      }

      const message = "API 응답 형식이 올바르지 않습니다.";
      setState((s) => ({ ...s, error: message, loading: false }));
      toast({ title: "불러오기 실패", description: message, variant: "error" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "알 수 없는 오류";
      setState((s) => ({ ...s, error: message, loading: false }));
      toast({ title: "네트워크 오류", description: message, variant: "error" });
    }
  }, [state.query, toast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const api: UseDftPayoutsReturn = useMemo(
    () => ({
      ...state,
      setPage: (page: number) =>
        setState((s) => ({ ...s, query: { ...s.query, page } })),
      setPageSize: (size: number) =>
        setState((s) => ({
          ...s,
          query: { ...s.query, pageSize: size, page: 1 },
        })),
      setUserId: (userId: string) =>
        setState((s) => ({ ...s, query: { ...s.query, userId, page: 1 } })),
      setUsername: (username: string) =>
        setState((s) => ({ ...s, query: { ...s.query, username, page: 1 } })), // ← 추가
      setSearch: (q: string) =>
        setState((s) => ({ ...s, query: { ...s.query, search: q, page: 1 } })),
      setDateFrom: (iso: string) =>
        setState((s) => ({
          ...s,
          query: { ...s.query, dateFrom: iso, page: 1 },
        })),
      setDateTo: (iso: string) =>
        setState((s) => ({
          ...s,
          query: { ...s.query, dateTo: iso, page: 1 },
        })),
      setHasMiningPayout: (v: "yes" | "no" | "all") =>
        setState((s) => ({
          ...s,
          query: { ...s.query, hasMiningPayout: v, page: 1 },
        })),
      setSort: (v) =>
        setState((s) => ({ ...s, query: { ...s.query, sort: v, page: 1 } })),
      reload: fetchList,
    }),
    [state, fetchList]
  );

  return api;
};
