// src/app/[locale]/(site)/menu/announcement/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations, useFormatter } from "next-intl";

// ===== Types =====
interface SitePostListItem {
  id: string;
  title: string;
  publishedAt: string; // ISO
}

interface SitePostDetail {
  id: string;
  title: string;
  bodyHtml: string;
  publishedAt: string | null; // ISO or null
  createdAt: string; // ISO
}

type SiteListResult =
  | { ok: true; data: SitePostListItem[] }
  | { ok: false; error: string };

type SiteDetailResult =
  | { ok: true; data: SitePostDetail }
  | { ok: false; error: string };

// ===== util =====
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

export default function AnnouncementSitePage() {
  const t = useTranslations("menu.announcement");
  const f = useFormatter();

  const [list, setList] = useState<SitePostListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<SitePostDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await jsonFetch<SiteListResult>("/api/menu/announcement", {
        cache: "no-store",
      });
      if (raw.ok) setList(raw.data);
      else throw new Error(raw.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setErrorDetail(null);
    try {
      const raw = await jsonFetch<SiteDetailResult>(
        `/api/menu/announcement?id=${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );
      if (raw.ok) setDetail(raw.data);
      else throw new Error(raw.error);
    } catch (e) {
      setErrorDetail(e instanceof Error ? e.message : "unknown error");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const clearDetail = useCallback(() => {
    setDetail(null);
    setErrorDetail(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ordered = useMemo(
    () =>
      [...list].sort((a, b) => {
        // 최신 발행일 순
        return (b.publishedAt || "").localeCompare(a.publishedAt || "");
      }),
    [list]
  );

  const formatDateTime = (iso: string): string =>
    f.dateTime(new Date(iso), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("header.title")}</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm" onClick={refresh} disabled={loading}>
            {t("actions.refresh")}
          </button>
          <Link href="/" className="btn btn-ghost btn-sm">
            {t("actions.home")}
          </Link>
        </div>
      </div>

      {/* 에러 */}
      {error ? (
        <div className="alert alert-error mb-4">
          <span>
            {t("messages.errorPrefix")} {error}
          </span>
        </div>
      ) : null}

      {/* 목록 */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>{t("table.colTitle")}</th>
                  <th className="w-48">{t("table.colPublishedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((row) => (
                  <tr
                    key={row.id}
                    className="hover cursor-pointer"
                    onClick={() => {
                      void loadDetail(row.id);
                      window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: "smooth",
                      });
                    }}
                  >
                    <td className="font-medium">{row.title}</td>
                    <td>{formatDateTime(row.publishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading ? (
              <div className="mt-2 text-sm">{t("messages.loadingList")}</div>
            ) : null}
            {ordered.length === 0 && !loading ? (
              <div className="mt-2 text-sm opacity-70">
                {t("messages.emptyList")}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 상세 */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">{t("detail.title")}</h2>
          {detail ? (
            <button className="btn btn-ghost btn-sm" onClick={clearDetail}>
              {t("detail.close")}
            </button>
          ) : null}
        </div>

        {loadingDetail ? (
          <div className="alert">
            <span>{t("detail.loading")}</span>
          </div>
        ) : null}
        {errorDetail ? (
          <div className="alert alert-error">
            <span>
              {t("messages.errorPrefix")} {errorDetail}
            </span>
          </div>
        ) : null}

        {detail ? (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="text-lg font-bold mb-2">{detail.title}</h3>
              <div className="text-xs opacity-70 mb-4">
                {t("detail.publishedLabel")}:{" "}
                {detail.publishedAt ? formatDateTime(detail.publishedAt) : "-"}
              </div>
              <div
                className="prose max-w-none"
                // 서버에 저장된 sanitize된 HTML 사용
                dangerouslySetInnerHTML={{ __html: detail.bodyHtml ?? "" }}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-70">{t("detail.placeholder")}</div>
        )}
      </div>
    </div>
  );
}
