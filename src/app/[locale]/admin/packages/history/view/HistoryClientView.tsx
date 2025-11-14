// src/app/admin/packages/history/view/HistoryClientView.tsx
"use client";

import React from "react";
import HistoryFiltersView from "./HistoryFiltersView";
import HistoryTableView from "./HistoryTableView";
import { usePackageHistory } from "../hooks/usePackageHistory";

/** ===== daisyUI 기반 공통 컴포넌트 (이 파일 내부에 정의) ===== */
type HeaderProps = { title: string; subtitle?: React.ReactNode };
function PageHeaderDaisy({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle ? <div className="text-base-content/60">{subtitle}</div> : null}
    </header>
  );
}

type SectionProps = { children: React.ReactNode };
function SectionDaisy({ children }: SectionProps) {
  return <section className="w-full">{children}</section>;
}

type CardProps = {
  title?: string;
  children: React.ReactNode;
  padding?: "sm" | "md" | "lg";
  ghost?: boolean;
  bordered?: boolean;
};
function CardDaisy({
  title,
  children,
  padding = "md",
  ghost = false,
  bordered = true,
}: CardProps) {
  const padCls = padding === "sm" ? "p-3" : padding === "lg" ? "p-6" : "p-4";
  const baseCls = [
    "card",
    ghost ? "bg-base-100/0 shadow-none" : "bg-base-100 shadow",
    bordered ? "border border-base-300" : "border-0",
  ].join(" ");
  return (
    <div className={baseCls}>
      <div className={`card-body ${padCls}`}>
        {title ? <h2 className="card-title">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}

type LoadingProps = { text?: string };
function LoadingInline({ text }: LoadingProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="loading loading-spinner" aria-hidden />
      {text ? <span className="text-base-content/70">{text}</span> : null}
    </div>
  );
}

type ErrorProps = { error: string };
function ErrorAlert({ error }: ErrorProps) {
  return (
    <div role="alert" className="alert alert-error">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10.34 3.94a1.5 1.5 0 0 1 3.32 0l.34 6.06a1.5 1.5 0 0 1-1.5 1.6h-1a1.5 1.5 0 0 1-1.5-1.6l.34-6.06zM12 17.25h.01"
        />
      </svg>
      <span className="font-medium">오류</span>
      <span className="truncate">{error}</span>
    </div>
  );
}

/** ===== 실제 화면 ===== */
export default function HistoryClientView() {
  const {
    page,
    pageSize,
    data,
    loading,
    error,
    onPageChange,
    onPageSizeChange,
  } = usePackageHistory();

  return (
    <div className="space-y-4">
      <PageHeaderDaisy
        title="패키지 구매 내역"
        subtitle={
          data ? (
            <span className="text-base-content/60">
              총 {data.total.toLocaleString()}건
            </span>
          ) : undefined
        }
      />

      <SectionDaisy>
        <CardDaisy>
          <HistoryFiltersView />
        </CardDaisy>
      </SectionDaisy>

      <SectionDaisy>
        <CardDaisy title="내역">
          {loading && <LoadingInline text="불러오는 중…" />}
          {error && <ErrorAlert error={error} />}
          {data ? (
            <HistoryTableView
              rows={data.items}
              page={page}
              pageSize={pageSize}
              total={data.total}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          ) : (
            !loading &&
            !error && (
              <HistoryTableView
                rows={[]}
                page={page}
                pageSize={pageSize}
                total={0}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            )
          )}
        </CardDaisy>
      </SectionDaisy>

      {/* 외부 페이지네이션은 삭제됨 */}
    </div>
  );
}
