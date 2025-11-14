"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { usePackageDetail } from "../hooks/usePackageDetail";
import PackageDetailCard from "../view/PackageDetailCard";

export default function PackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { item, loading, error } = usePackageDetail(id ?? null);

  return (
    <main className="p-4 md:p-6 space-y-4">
      <div className="card p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">패키지 상세</h1>
        <Link href="/admin/packages" className="btn btn-outline btn-sm">
          목록으로
        </Link>
      </div>

      {loading && (
        <div className="alert">
          <span>불러오는 중…</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {item && <PackageDetailCard item={item} />}
    </main>
  );
}
