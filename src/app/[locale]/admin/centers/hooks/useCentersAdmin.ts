// src/app/admin/centers/hooks/useCentersAdmin.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CenterManagerItem,
  DeletePayload,
  RegisterPayload,
  SearchUserRow,
} from "../types/admin-centers";

import {
  coercePercentToNumber,
  isDeleteResult,
  isListCentersResponse,
  isNonEmptyString,
  isPostResult,
  isSearchUsersResponse,
  isValidPercentString,
} from "../guard";
import { useToast } from "@/components/ui";

export function useCentersAdmin() {
  const { toast } = useToast();

  const [centers, setCenters] = useState<CenterManagerItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  const [query, setQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [results, setResults] = useState<SearchUserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUserRow | null>(null);
  const [percent, setPercent] = useState<string>("2.0");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const percentInputRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = useMemo<boolean>(() => {
    if (!selectedUser) return false;
    if (selectedUser.isCenterManager) return false;
    if (!isValidPercentString(percent)) return false;
    return true;
  }, [selectedUser, percent]);

  const loadCenters = useCallback(async (): Promise<void> => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/centers", {
        method: "GET",
        cache: "no-store",
      });
      const json: unknown = await res.json();
      if (isListCentersResponse(json)) {
        setCenters(json.data);
      } else {
        toast({
          title: "불러오기 실패",
          description: "응답 형식이 올바르지 않습니다.",
        });
      }
    } catch {
      toast({ title: "불러오기 실패", description: "네트워크 오류" });
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadCenters();
  }, [loadCenters]);

  const onSearch = useCallback(async (): Promise<void> => {
    if (!isNonEmptyString(query)) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/admin/centers?q=${encodeURIComponent(query.trim())}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );
      const json: unknown = await res.json();
      if (isSearchUsersResponse(json) && (json as { ok: boolean }).ok) {
        const j = json as { ok: true; data: SearchUserRow[] };
        setResults(j.data);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const onRegister = useCallback(async (): Promise<void> => {
    if (!selectedUser) return;
    const pct = coercePercentToNumber(percent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      toast({
        title: "유효하지 않은 퍼센트",
        description: "0 ~ 100 사이 숫자여야 합니다.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: RegisterPayload = {
        userId: selectedUser.id,
        percent: pct,
        isActive: true,
      };
      const res = await fetch("/api/admin/centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: unknown = await res.json();
      if (isPostResult(json) && (json as { ok: boolean }).ok) {
        toast({
          title: "등록 완료",
          description: `${selectedUser.username} 센터장 등록`,
        });
        await loadCenters();
        setSelectedUser(null);
        setPercent("2.0");
        if (percentInputRef.current) percentInputRef.current.value = "2.0";
        setResults((prev) =>
          prev.map((r) =>
            r.id === payload.userId ? { ...r, isCenterManager: true } : r
          )
        );
      } else if (isPostResult(json) && !(json as { ok: boolean }).ok) {
        const j = json as { ok: false; code: string; message: string };
        toast({ title: "등록 실패", description: `[${j.code}] ${j.message}` });
      } else {
        toast({ title: "등록 실패", description: "알 수 없는 응답" });
      }
    } catch {
      toast({ title: "등록 실패", description: "네트워크 오류" });
    } finally {
      setSubmitting(false);
    }
  }, [selectedUser, percent, loadCenters, toast]);

  const onDelete = useCallback(
    async (userId: string): Promise<void> => {
      const ok = window.confirm(
        "해당 센터장을 삭제하고 연결된 링크도 해제합니다. 진행할까요?"
      );
      if (!ok) return;

      try {
        const payload: DeletePayload = { userId };
        const res = await fetch("/api/admin/centers", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json: unknown = await res.json();
        if (isDeleteResult(json) && (json as { ok: boolean }).ok) {
          toast({
            title: "삭제 완료",
            description: "센터장 해제 및 링크 제거",
          });
          await loadCenters();
        } else if (isDeleteResult(json) && !(json as { ok: boolean }).ok) {
          const j = json as { ok: false; code: string; message: string };
          toast({
            title: "삭제 실패",
            description: `[${j.code}] ${j.message}`,
          });
        } else {
          toast({ title: "삭제 실패", description: "알 수 없는 응답" });
        }
      } catch {
        toast({ title: "삭제 실패", description: "네트워크 오류" });
      }
    },
    [loadCenters, toast]
  );

  return {
    // state
    centers,
    loadingList,

    query,
    searching,
    results,
    selectedUser,
    percent,
    submitting,
    percentInputRef,

    // computed
    canSubmit,

    // actions
    setQuery,
    setSelectedUser,
    setPercent,
    onSearch,
    onRegister,
    onDelete,
  };
}
