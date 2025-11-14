// src/components/ui/data/AssetCard.tsx
"use client";

import React from "react";

export type BadgeColor =
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "neutral";

export interface AssetCardProps {
  code: string;
  name: string;
  amount: number;
  badge?: BadgeColor;
  compact?: boolean;
  /** 사용자 지정 포맷(소수 2자리 보장은 내부에서 처리) */
  formatAmount?: (n: number) => string;
}

/** 숫자 길이에 따른 동적 폰트 크기 */
function valueSizeClass(len: number, compact: boolean): string {
  if (len <= 8) return compact ? "text-xl" : "text-3xl";
  if (len <= 12) return compact ? "text-lg" : "text-2xl";
  if (len <= 16) return compact ? "text-base" : "text-xl";
  if (len <= 20) return compact ? "text-sm" : "text-lg";
  return compact ? "text-xs" : "text-base";
}

export function AssetCard({
  code,
  name,
  amount,
  badge = "neutral",
  compact = false,
  formatAmount,
}: AssetCardProps) {
  // 기본: 소수점 2자리 고정
  const defaultFormatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // 커스텀 포맷터가 있으면 적용하되 소수 2자리 보정
  const custom = formatAmount ? formatAmount(amount) : null;
  const valueStr =
    custom != null
      ? (() => {
          const m = custom.match(/(-?\d[\d,]*)\.(\d+)/);
          if (!m) return defaultFormatted;
          const intPart = m[1] ?? "";
          const frac = (m[2] ?? "").slice(0, 2).padEnd(2, "0");
          return custom.replace(m[0], `${intPart}.${frac}`);
        })()
      : defaultFormatted;

  // 폰트 크기 산정용 길이(콤마/공백 제외)
  const lenForSizing = valueStr.replace(/[, \u00A0]/g, "").length;
  const dynSize = valueSizeClass(lenForSizing, compact);

  const titleCls = compact ? "stat-title text-xs" : "stat-title";
  const valueCls = `stat-value ${dynSize} tabular-nums whitespace-nowrap text-left w-full`;

  return (
    // ✅ 카드 안쪽 여백 추가 (좌우/상하) — 값은 여전히 왼쪽 정렬
    <div className="stats stats-group w-full px-3 py-2 sm:px-4 sm:py-3">
      <div className="stat p-0 flex flex-col items-start gap-2 w-full">
        {/* 상단: 배지 + 타이틀 */}
        <div className="flex items-center gap-2">
          <span className={`badge badge-${badge}`} aria-label={code}>
            {code}
          </span>
          <span className={titleCls}>{name}</span>
        </div>

        {/* 하단: 수량 */}
        <div className={valueCls}>{valueStr}</div>
      </div>
    </div>
  );
}
