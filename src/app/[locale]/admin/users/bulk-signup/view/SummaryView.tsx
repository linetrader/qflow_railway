// src/app/admin/users/bulk-signup/view/SummaryView.tsx
"use client";

type Summary = {
  requested: number;
  created: number;
  skipped: number;
  dry: number;
  errors: number;
  lastParent: string;
  mode: "range" | "count" | "attachByLevel";
  parentsUsed?: number;
};

export function SummaryView(props: { summary: Summary }) {
  const s = props.summary;
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h3 className="card-title">요약</h3>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>모드: {s.mode}</div>
          {s.parentsUsed !== undefined ? (
            <div>사용한 부모 수: {s.parentsUsed}</div>
          ) : null}
          <div>요청 수: {s.requested}</div>
          <div>생성됨: {s.created}</div>
          <div>건너뜀(존재): {s.skipped}</div>
          <div>드라이런: {s.dry}</div>
          <div>에러: {s.errors}</div>
          <div>마지막 부모: {s.lastParent}</div>
        </div>
      </div>
    </div>
  );
}
