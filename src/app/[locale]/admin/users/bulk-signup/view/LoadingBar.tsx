// src/app/admin/users/bulk-signup/view/LoadingBar.tsx
"use client";

export function LoadingBar(props: { text?: string }) {
  return (
    <div className="alert">
      <span className="loading loading-spinner mr-2" />
      {props.text ?? "로딩 중…"}
    </div>
  );
}
