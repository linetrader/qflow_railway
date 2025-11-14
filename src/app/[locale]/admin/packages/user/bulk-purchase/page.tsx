"use client";

import { useMemo } from "react";
import BulkPurchaseFormView from "./view/BulkPurchaseFormView";
import BulkPurchaseResultView from "./view/BulkPurchaseResultView";
import BulkPurchaseLayoutView from "./view/BulkPurchaseLayoutView";
import { useBulkPurchase } from "./hooks/useBulkPurchase";

export default function Page() {
  const {
    // packages
    packages,
    pkLoading,
    pkError,
    pkSelectDisabled,
    selectedPackageId,
    setSelectedPackageId,

    // run
    submitting,
    result,
    error,
    submit,
  } = useBulkPurchase();

  const subtitle = useMemo(() => {
    if (pkLoading) return "패키지 목록 불러오는 중…";
    if (pkError) return `패키지 목록 오류: ${pkError}`;
    return packages.length
      ? `패키지 ${packages.length.toLocaleString()}개`
      : "패키지 없음";
  }, [pkLoading, pkError, packages.length]);

  return (
    <BulkPurchaseLayoutView
      subtitle={subtitle}
      childrenTop={
        <>
          <div className="card p-3">
            <BulkPurchaseFormView
              onSubmit={submit}
              packages={packages}
              selectedPackageId={selectedPackageId}
              setSelectedPackageId={setSelectedPackageId}
              pkSelectDisabled={pkSelectDisabled}
              submitting={submitting}
              pkLoading={pkLoading}
              pkError={pkError}
            />
          </div>

          {submitting && !result && !error && (
            <div className="alert">
              <span>요청 처리 중…</span>
            </div>
          )}
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {result && <BulkPurchaseResultView result={result} />}
        </>
      }
    />
  );
}
