"use client";

import Link from "next/link";
import type { PackageDetail } from "@/types/admin/packages";

export default function PackageDetailCard(props: { item: PackageDetail }) {
  const { item } = props;
  return (
    <div className="card p-4 space-y-4">
      <h3 className="font-semibold">패키지 정보</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="이름" value={item.name} />
        <Field label="가격" value={item.price} />
        <Field label="일일 DFT 수량" value={item.dailyDftAmount} />
        {/* 코드 스타일 표시는 asCode로 처리 */}
        <Field label="ID" value={item.id} asCode />
      </div>
      <div className="flex justify-end">
        <Link href={`/admin/packages/${item.id}/edit`} className="btn btn-sm">
          편집
        </Link>
      </div>
    </div>
  );
}

/** JSX.Element/ReactNode 없이 문자열만 받도록 제한 */
function Field(props: { label: string; value: string; asCode?: boolean }) {
  const { label, value, asCode } = props;
  return (
    <label className="form-control">
      <span className="label-text">{label}</span>
      {asCode ? (
        <code className="rounded bg-base-200 px-1 py-0.5 text-xs">{value}</code>
      ) : (
        <div className="p-2 rounded border border-base-300 min-h-10">
          {value}
        </div>
      )}
    </label>
  );
}
