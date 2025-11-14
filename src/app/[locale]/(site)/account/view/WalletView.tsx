// src/app/[locale]/(site)/account/view/WalletView.tsx
"use client";

import { type FormEvent } from "react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/feedback/Toast-provider";

export function WalletView(props: {
  state: {
    addr: string;
    valid: boolean;
    showOtp: boolean;
    otpCode: string;
    saving: boolean;
    serverErr: string | null;
    alreadyRegistered: boolean;
  };
  setters: {
    setAddr: (v: string) => void;
    setShowOtp: (v: boolean) => void;
    setOtpCode: (v: string) => void;
  };
  actions: {
    startSubmit: () => void;
    confirmSubmit: () => Promise<{
      ok: boolean;
      value?: string;
      message?: string;
    }>;
  };
  copyCurrent: () => Promise<void>;
}) {
  const { state, setters, actions, copyCurrent } = props;
  const { toast } = useToast();
  const t = useTranslations("account.wallet");
  const tCommonActions = useTranslations("common.actions");

  function onFormSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    actions.startSubmit();
  }

  async function onConfirm(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const res = await actions.confirmSubmit();
    toast({
      title: res.ok ? t("copyTitle.success") : t("copyTitle.error"),
      description:
        res.message ?? (res.ok ? t("copyDesc.success") : t("copyDesc.error")),
      variant: res.ok ? "success" : "error",
      position: "top-right",
      duration: 2200,
      closable: true,
    });
  }

  async function onCopy(): Promise<void> {
    try {
      await copyCurrent();
      toast({
        title: t("copyTitle.success"),
        description: t("copyDesc.success"),
        variant: "success",
        position: "top-right",
        duration: 1800,
        closable: true,
      });
    } catch {
      toast({
        title: t("copyTitle.error"),
        description: t("copyDesc.error"),
        variant: "error",
        position: "top-right",
        duration: 2200,
        closable: true,
      });
    }
  }

  return (
    <section className="space-y-3">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{t("title")}</h3>
            <div
              className={`badge ${
                state.alreadyRegistered ? "badge-success" : "badge-warning"
              }`}
            >
              {state.alreadyRegistered
                ? t("status.registered")
                : t("status.unregistered")}
            </div>
          </div>

          {state.alreadyRegistered ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-base-content/20 bg-base-100 px-3 py-2">
                <p className="mt-1 font-mono text-sm break-all">{state.addr}</p>
              </div>
              <button
                onClick={onCopy}
                className="btn btn-outline"
                aria-label={tCommonActions("copy")}
                title={tCommonActions("copy")}
                type="button"
              >
                <ClipboardDocumentIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>
          ) : (
            <form onSubmit={onFormSubmit} className="grid grid-cols-1 gap-3">
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">{t("addressLabel")}</span>
                </div>
                <input
                  id="wallet"
                  className="input input-bordered w-full"
                  value={state.addr}
                  onChange={(e) => setters.setAddr(e.target.value)}
                  placeholder={t("placeholder")}
                />
              </label>

              {!state.valid && state.addr.trim().length > 0 && (
                <p className="text-xs text-error">{t("invalid")}</p>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full h-11 rounded-xl"
                disabled={!state.valid}
                title={t("register")}
              >
                {t("register")}
              </button>
            </form>
          )}

          {state.showOtp && (
            <dialog className="modal modal-open">
              <div className="modal-box">
                <h3 className="font-bold text-lg">{t("dialog.title")}</h3>
                <p className="py-2 text-sm text-base-content/60">
                  {t("dialog.desc")}
                </p>
                <form onSubmit={onConfirm} className="space-y-3">
                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text">
                        {t("dialog.inputLabel")}
                      </span>
                    </div>
                    <input
                      className="input input-bordered w-full"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      value={state.otpCode}
                      onChange={(e) =>
                        setters.setOtpCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                    />
                  </label>

                  {state.serverErr && (
                    <p className="text-xs text-error">{state.serverErr}</p>
                  )}

                  <div className="modal-action">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setters.setShowOtp(false)}
                      disabled={state.saving}
                    >
                      {t("dialog.cancel")}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={state.saving || state.otpCode.length !== 6}
                      title={
                        state.otpCode.length !== 6
                          ? t("dialog.need6")
                          : t("dialog.confirm")
                      }
                    >
                      {state.saving
                        ? t("dialog.confirming")
                        : t("dialog.confirm")}
                    </button>
                  </div>
                </form>
              </div>

              <form method="dialog" className="modal-backdrop">
                <button onClick={() => setters.setShowOtp(false)}>close</button>
              </form>
            </dialog>
          )}
        </div>
      </div>
    </section>
  );
}
