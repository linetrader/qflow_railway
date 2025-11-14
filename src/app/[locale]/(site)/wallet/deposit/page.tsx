// src/app/[locale]/(site)/wallet/deposit/page.tsx
"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import type { ToastVariant } from "@/types/common";
import { useRouter } from "next/navigation";
import { useDepositAddress } from "./hooks/useDepositAddress";
import { useQrCode } from "./hooks/useQrCode";
import { useTranslations } from "next-intl";

export default function DepositPage() {
  const t = useTranslations("wallet.deposit");
  const router = useRouter();
  const { loading, error, payload, refresh } = useDepositAddress();
  const addr = payload?.depositAddress ?? "";
  const { dataUrl: qr, generating: qrLoading } = useQrCode(addr);
  const [toastOpen, setToastOpen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");
  const [toastVariant, setToastVariant] = useState<ToastVariant>("info");

  const showToast = useCallback(
    (msg: string, variant: ToastVariant = "info") => {
      setToastMsg(msg);
      setToastVariant(variant);
      setToastOpen(true);
      window.setTimeout(() => setToastOpen(false), 1800);
    },
    []
  );

  const copyAddr = useCallback(async () => {
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      showToast(t("address.copied"), "success");
    } catch {
      showToast(t("address.clipboardUnsupported"), "error");
    }
  }, [addr, showToast, t]);

  return (
    <main className="mx-auto max-w-screen-sm px-4 pt-4 pb-24 space-y-6">
      {/* Toast (daisyUI) */}
      {toastOpen && (
        <div className="toast toast-top toast-end z-50">
          <div
            className={[
              "alert",
              toastVariant === "success"
                ? "alert-success"
                : toastVariant === "warning"
                ? "alert-warning"
                : toastVariant === "error"
                ? "alert-error"
                : "alert-info",
            ].join(" ")}
          >
            <span className="text-sm">{toastMsg}</span>
          </div>
        </div>
      )}

      {/* 상단 바 */}
      <section className="space-y-2">
        <div className="card">
          <div className="card-body flex flex-row items-center gap-2 py-3">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              aria-label={t("header.back")}
              title={t("header.back")}
              onClick={() => router.back()}
            >
              {/* chevron-left */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M15 18l-6-6 6-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="ml-1">
              {loading && !error && (
                <span className="text-sm text-base-content/60">
                  {t("header.preparing")}
                </span>
              )}
              {error && (
                <div role="alert" className="alert alert-error py-2 min-h-0">
                  <span className="text-sm">{error}</span>
                  <div className="ml-auto">
                    <button
                      className="btn btn-sm"
                      onClick={() => refresh()}
                      type="button"
                    >
                      {t("header.errorRetry")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="ml-auto">
              <div className="badge badge-info">
                {t("header.network", { name: "BEP-20" })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 본문 */}
      <section className="space-y-4">
        <div className="card">
          <div className="card-body items-center">
            <div className="rounded-xl border border-base-300 bg-white p-3">
              {qr ? (
                <Image
                  src={qr}
                  alt="Deposit QR Code"
                  width={240}
                  height={240}
                  priority
                  className="h-[240px] w-[240px]"
                />
              ) : (
                <div className="grid h-[240px] w-[240px] place-items-center text-base-content/50">
                  {addr
                    ? qrLoading
                      ? t("qr.generating")
                      : t("qr.none")
                    : loading
                    ? t("qr.preparingAddr")
                    : t("qr.noAddr")}
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-base-content/60">{t("qr.hint")}</p>

            <div className="w-full mt-6">
              <label className="block text-sm text-base-content mb-1">
                {t("address.label")}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-base-300 bg-base-200 px-3 py-2">
                  <p className="font-mono text-sm text-base-content break-all select-all">
                    {addr || (loading ? "(…)" : "-")}
                  </p>
                </div>
                {addr && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={copyAddr}
                    aria-label={t("address.label")}
                    title={t("address.label")}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        d="M9 9h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
