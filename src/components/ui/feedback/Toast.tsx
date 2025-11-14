// src/components/ui/feedback/Toast.tsx
"use client";
import type { ReactNode } from "react";

export type ToastVariant = "info" | "success" | "warning" | "error";
export type ToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

export type ToastProps = {
  children: ReactNode;
  variant?: ToastVariant;
  className?: string; // 컨테이너 커스터마이즈
  position?: ToastPosition; // ✅ 위치 지정
};

export function Toast({
  children,
  variant = "info",
  className,
  position = "bottom-right",
}: ToastProps) {
  const variantClass =
    variant === "info"
      ? "alert-info"
      : variant === "success"
      ? "alert-success"
      : variant === "warning"
      ? "alert-warning"
      : "alert-error";

  const positionClass =
    position === "top-right"
      ? "toast-top toast-end"
      : position === "top-left"
      ? "toast-top toast-start"
      : position === "bottom-left"
      ? "toast-bottom toast-start"
      : "toast-bottom toast-end"; // bottom-right

  return (
    <div
      className={["toast", positionClass, "z-50", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={["alert", variantClass].join(" ")}>{children}</div>
    </div>
  );
}
