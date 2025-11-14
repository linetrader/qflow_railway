// src/app/admin/users/bulk-signup/view/ErrorAlert.tsx
"use client";

export function ErrorAlert(props: { message: string }) {
  return (
    <div role="alert" className="alert alert-error">
      <span className="font-medium">오류</span>
      <span className="truncate">{props.message}</span>
    </div>
  );
}
