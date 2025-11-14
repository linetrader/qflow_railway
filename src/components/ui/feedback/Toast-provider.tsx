// src/components/ui/feedback/Toast-provider.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import React from "react";
import { Toast, type ToastPosition, type ToastVariant } from "./Toast";

export type ToastItem = {
  id: number;
  title?: string;
  description?: string;
  variant?: ToastVariant; // 예: "info" | "success" | "error" | "warning" ...
  position?: ToastPosition; // 예: "top-right" | "top-left" | ...
  /** 자동 닫힘(ms). 0 또는 undefined면 자동 닫힘 없음 */
  duration?: number;
  /** 닫기 버튼 표시 여부 */
  closable?: boolean;
};

/** 공개 API: 기존 메서드 + 편의 헬퍼(success/info/error) */
type ToastApi = {
  /** 생성하고 id 반환 */
  toast: (opts: Omit<ToastItem, "id">) => number;
  /** 특정 토스트 닫기 */
  dismiss: (id: number) => void;
  /** 모두 닫기 */
  clear: () => void;
  /** 편의 헬퍼 */
  success: (
    message: string,
    opts?: Omit<ToastItem, "id" | "variant" | "description" | "title"> & {
      title?: string;
    }
  ) => number;
  info: (
    message: string,
    opts?: Omit<ToastItem, "id" | "variant" | "description" | "title"> & {
      title?: string;
    }
  ) => number;
  error: (
    message: string,
    opts?: Omit<ToastItem, "id" | "variant" | "description" | "title"> & {
      title?: string;
    }
  ) => number;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function ToastProvider({
  children,
}: PropsWithChildren): React.ReactNode {
  const idRef = useRef<number>(1);
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number): void => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback((): void => setItems([]), []);

  const toast = useCallback(
    (opts: Omit<ToastItem, "id">): number => {
      const id = idRef.current++;
      const item: ToastItem = {
        id,
        title: opts.title,
        description: opts.description,
        variant: opts.variant ?? "info",
        position: opts.position ?? "top-right",
        duration: opts.duration ?? 3000,
        closable: opts.closable ?? true,
      };
      setItems((prev) => [...prev, item]);
      if (item.duration && item.duration > 0) {
        window.setTimeout(() => dismiss(id), item.duration);
      }
      return id;
    },
    [dismiss]
  );

  // --- 편의 헬퍼 ---
  const success = useCallback<ToastApi["success"]>(
    (message, opts) =>
      toast({
        variant: "success",
        description: message,
        title: opts?.title,
        position: opts?.position,
        duration: opts?.duration,
        closable: opts?.closable,
      }),
    [toast]
  );

  const info = useCallback<ToastApi["info"]>(
    (message, opts) =>
      toast({
        variant: "info",
        description: message,
        title: opts?.title,
        position: opts?.position,
        duration: opts?.duration,
        closable: opts?.closable,
      }),
    [toast]
  );

  const error = useCallback<ToastApi["error"]>(
    (message, opts) =>
      toast({
        variant: "error",
        description: message,
        title: opts?.title,
        position: opts?.position,
        duration: opts?.duration,
        closable: opts?.closable,
      }),
    [toast]
  );

  const api = useMemo<ToastApi>(
    () => ({ toast, dismiss, clear, success, info, error }),
    [toast, dismiss, clear, success, info, error]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <Toaster items={items} onClose={dismiss} />
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

/** 포털로 실제 토스트를 화면 구석에 렌더링 */
function Toaster({
  items,
  onClose,
}: {
  items: ToastItem[];
  onClose: (id: number) => void;
}): React.ReactNode {
  if (typeof document === "undefined") return null; // SSR 안전

  // 위치별 스택
  const groupByPos: Partial<Record<ToastPosition, ToastItem[]>> = {};
  for (const it of items) {
    const pos: ToastPosition = it.position ?? "top-right";
    if (!groupByPos[pos]) groupByPos[pos] = [];
    groupByPos[pos]!.push(it);
  }

  const entries = Object.entries(groupByPos) as Array<
    [ToastPosition, ToastItem[]]
  >;

  return createPortal(
    <>
      {entries.map(([position, list]) => (
        <div key={position} className="pointer-events-none fixed z-[9999]">
          {/* 위치별 컨테이너 클래스 */}
          <div
            className={[
              position.includes("top") ? "top-4" : "bottom-4",
              position.includes("right") ? "right-4" : "",
              position.includes("left") ? "left-4" : "",
              position.includes("center") ? "left-1/2 -translate-x-1/2" : "",
            ].join(" ")}
          >
            <div className="flex flex-col gap-2">
              {list.map((t) => (
                <Toast
                  key={t.id}
                  position={position}
                  variant={t.variant}
                  className="pointer-events-auto"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      {t.title ? (
                        <div className="font-semibold">{t.title}</div>
                      ) : null}
                      {t.description ? (
                        <div className="text-sm opacity-90">
                          {t.description}
                        </div>
                      ) : null}
                    </div>
                    {t.closable ? (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onClose(t.id)}
                        aria-label="close"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                </Toast>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>,
    document.body
  );
}
