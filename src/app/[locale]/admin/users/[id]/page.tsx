// src/app/admin/users/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchJson } from "@/app/[locale]/admin/lib/fetchJson";
import { isAbortError } from "../../lib/fetchWithRetry";
import { useToast } from "@/components/ui";

type UserItem = {
  id: string;
  username: string;
  email: string;
  name: string;
  referralCode: string;
  level: number;
  countryCode: string | null;
  googleOtpEnabled: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

type ApiOk = { item: UserItem };

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<UserItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // ISO → 로컬 문자열 메모이제이션
  const createdAtText = useMemo(
    () => (data ? new Date(data.createdAt).toLocaleString() : ""),
    [data]
  );
  const updatedAtText = useMemo(
    () => (data ? new Date(data.updatedAt).toLocaleString() : ""),
    [data]
  );

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!id) throw new Error("INVALID_ID");
        const res = await fetchJson<ApiOk>(`/api/admin/users/${id}`, {
          signal: ctrl.signal,
          cache: "no-store",
        });
        setData(res.item ?? null);
      } catch (e: unknown) {
        if (isAbortError(e)) return;
        const msg = e instanceof Error ? e.message : "UNKNOWN_ERROR";
        setError(msg);
        setData(null);
        toast({
          title: "불러오기 실패",
          description: msg,
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [id, toast]);

  const onRefresh = () => {
    setRefreshing(true);
    try {
      router.refresh();
      toast({
        title: "새로고침",
        description: "페이지 데이터를 갱신했습니다.",
      });
    } finally {
      setTimeout(() => setRefreshing(false), 300);
    }
  };

  return (
    <div className="space-y-4" data-theme="">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">유저 상세</h1>
        <div className="flex gap-2">
          <Link href="/admin/users" className="btn btn-outline">
            목록으로
          </Link>
          <button
            type="button"
            className={`btn btn-ghost ${refreshing ? "loading" : ""}`}
            onClick={onRefresh}
            disabled={refreshing}
            aria-busy={refreshing}
          >
            {refreshing ? "새로고침…" : "새로고침"}
          </button>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="alert">
          <span className="loading loading-spinner mr-2" />
          불러오는 중…
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div role="alert" className="alert alert-error">
          <span className="font-medium">에러</span>
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* 본문 */}
      {data && !loading && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title mb-2">기본 정보</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm text-base-content/70">아이디</span>
                <span className="font-medium">{data.username}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm text-base-content/70">이름</span>
                <span>{data.name}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm text-base-content/70">이메일</span>
                <span>{data.email}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm text-base-content/70">레벨</span>
                <span>{String(data.level)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm text-base-content/70">국가</span>
                <span>{data.countryCode ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm text-base-content/70">OTP</span>
                <span>{data.googleOtpEnabled ? "사용" : "미사용"}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2 md:col-span-2">
                <span className="text-sm text-base-content/70">추천코드</span>
                <span className="font-medium">{data.referralCode}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm text-base-content/70">가입일</span>
                <span>{createdAtText}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm text-base-content/70">수정일</span>
                <span>{updatedAtText}</span>
              </div>
              <div className="flex items-center justify-between md:col-span-2">
                <span className="text-sm text-base-content/70">ID</span>
                <code className="rounded bg-base-200 px-2 py-1 text-xs">
                  {data.id}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
