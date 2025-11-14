// src/app/(site)/(home)/hooks/useHomeData.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiHomeResponseSchema, type ApiHomeResponse } from "@/types/home";

/** 공지사항 목록(최대 5개) */
export type AnnouncementTopItem = {
  id: string;
  title: string;
  publishedAt: string; // ISO
};

export type UseHomeDataReturn = {
  loading: boolean;
  err: string | null;
  authed: boolean;
  balances: ApiHomeResponse["balances"];
  rewardHistory: ApiHomeResponse["rewardHistory"];
  packageHistory: ApiHomeResponse["packageHistory"];
  announcementsTop: AnnouncementTopItem[]; // ✅ 추가
};

export function useHomeData(): UseHomeDataReturn {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean>(false);
  const [balances, setBalances] = useState<ApiHomeResponse["balances"]>(null);
  const [rewardHistory, setRewardHistory] = useState<
    ApiHomeResponse["rewardHistory"]
  >([]);
  const [packageHistory, setPackageHistory] = useState<
    ApiHomeResponse["packageHistory"]
  >([]);
  const [announcementsTop, setAnnouncementsTop] = useState<
    AnnouncementTopItem[]
  >([]);

  // 홈 데이터(인증 필요)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/home", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          credentials: "same-origin",
        });

        const text = await res.text();
        if (res.status === 401) {
          router.push("/auth/login?next=/");
          return;
        }

        let parsed: ApiHomeResponse | null = null;
        try {
          const json = JSON.parse(text) as unknown;
          const result = ApiHomeResponseSchema.safeParse(json);
          if (result.success) parsed = result.data;
        } catch {
          /* noop */
        }

        if (!res.ok || !parsed) {
          throw new Error(
            `API 실패(HTTP ${res.status}): ${text.slice(0, 200)}`
          );
        }

        if (!ignore) {
          setAuthed(parsed.authed);
          setBalances(parsed.balances);
          setRewardHistory(parsed.rewardHistory);
          setPackageHistory(parsed.packageHistory);
        }
      } catch (e: unknown) {
        if (!ignore) setErr(e instanceof Error ? e.message : "네트워크 오류");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [router]);

  // 공지사항 목록(비인증 API) 상위 5개만
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch("/api/menu/announcement", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        // 유저 공지 API 응답 타입
        type ApiHomeHomeFetch =
          | {
              ok: true;
              data: Array<{ id: string; title: string; publishedAt: string }>;
            }
          | { ok: false; error: string };

        const json = (await res.json()) as ApiHomeHomeFetch;
        if (!res.ok || !("ok" in json) || !json.ok)
          throw new Error("ANN_LIST_FAIL");
        if (abort) return;

        const top5 = json.data.slice(0, 5).map((r) => ({
          id: r.id,
          title: r.title,
          publishedAt: r.publishedAt,
        }));
        setAnnouncementsTop(top5);
      } catch {
        if (!abort) setAnnouncementsTop([]);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  return {
    loading,
    err,
    authed,
    balances,
    rewardHistory,
    packageHistory,
    announcementsTop,
  };
}
