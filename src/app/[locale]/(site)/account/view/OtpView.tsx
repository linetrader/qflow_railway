// src/app/[locale]/(site)/account/view/OtpView.tsx
"use client";

import { type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/feedback/Toast-provider";
import { useTranslations as useCommonT } from "next-intl";

export function OtpView(props: {
  enabled: boolean;
  secret: string;
  qr: string;
  code: string;
  setCode: (v: string) => void;
  onRegister: () => Promise<boolean>;
}) {
  const { enabled, secret, qr, code, setCode, onRegister } = props;
  const { toast } = useToast();
  const t = useTranslations("account.otp");
  const tCommon = useCommonT("common.status");

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const ok = await onRegister();
    toast({
      title: ok ? t("toast.successTitle") : t("toast.errorTitle"),
      description: ok ? t("toast.successDesc") : t("toast.errorDesc"),
      variant: ok ? "success" : "error",
      position: "top-right",
      duration: 2200,
      closable: true,
    });
  }

  return (
    <section className="space-y-3">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{t("title")}</h3>
            <div
              className={`badge ${enabled ? "badge-success" : "badge-warning"}`}
            >
              {enabled ? t("status.enabled") : t("status.disabled")}
            </div>
          </div>

          {enabled ? (
            <p className="text-sm text-base-content/60">
              {/* 활성화 시 별도 안내 생략 */}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="grid place-items-center">
                <div className="rounded-xl border border-base-content/20 bg-white p-3">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qr}
                      alt="OTP QR"
                      width={220}
                      height={220}
                      className="h-[220px] w-[220px] rounded"
                    />
                  ) : (
                    <div className="grid h-[220px] w-[220px] place-items-center text-base-content/50">
                      {tCommon("loading")}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-base-content/60">{t("scan")}</p>
              </div>

              <div>
                <label className="form-control w-full mb-3">
                  <div className="label">
                    <span className="label-text">{t("secretLabel")}</span>
                  </div>
                  <div className="rounded-lg border border-base-content/20 bg-base-100 px-3 py-2">
                    <p className="font-mono text-sm select-all break-all">
                      {secret || tCommon("loading")}
                    </p>
                  </div>
                </label>

                <label className="form-control w-full">
                  <div className="label">
                    <span className="label-text">{t("codeLabel")}</span>
                  </div>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="input input-bordered w-full"
                  />
                </label>

                <button
                  type="submit"
                  className="btn btn-primary w-full h-11 rounded-xl mt-3"
                  disabled={!secret || code.length !== 6}
                  title={t("register")}
                >
                  {t("register")}
                </button>

                <p className="mt-2 text-[11px] text-base-content/60">
                  {t("note")}
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
