// src/app/[locale]/(site)/account/view/ChangePasswordView.tsx
"use client";

import { useState, useCallback, useMemo, useId, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/feedback/Toast-provider";
import { PasswordField } from "@/components/ui";

type Rule = { ok: boolean; text: string };
export type PwRules = ReadonlyArray<Readonly<Rule>>;

export type ChangePasswordViewProps = {
  values: { currentPwd: string; newPwd: string; newPwd2: string };
  setters: {
    setCurrentPwd: (v: string) => void;
    setNewPwd: (v: string) => void;
    setNewPwd2: (v: string) => void;
  };
  flags: { newPwAllOk: boolean; confirmOk: boolean; canChangePwd: boolean };
  rules: PwRules;
  onSubmit: () => Promise<{ ok: boolean; message: string }>;
};

export function ChangePasswordView(props: ChangePasswordViewProps) {
  const { values, setters, flags, rules, onSubmit } = props;
  const { toast } = useToast();
  const t = useTranslations("account.password");

  const [show, setShow] = useState({
    current: false,
    new1: false,
    new2: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const sectionId = useId();
  const pwdCurrentId = `${sectionId}-current`;
  const pwdNewId = `${sectionId}-new`;
  const pwdNew2Id = `${sectionId}-new2`;

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!flags.canChangePwd || submitting) return;
      setSubmitting(true);
      try {
        const res = await onSubmit();
        toast({
          title: res.ok ? t("toast.successTitle") : t("toast.errorTitle"),
          description: res.message || (res.ok ? "" : t("toast.errorFallback")),
          variant: res.ok ? "success" : "error",
          position: "top-right",
          duration: 2200,
          closable: true,
        });
      } catch {
        toast({
          title: t("toast.errorTitle"),
          description: t("toast.errorFallback"),
          variant: "error",
          position: "top-right",
          duration: 2200,
          closable: true,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [flags.canChangePwd, submitting, onSubmit, toast, t]
  );

  const ruleItems = useMemo(
    () =>
      rules.map((r) => (
        <li
          key={r.text}
          className={`transition-colors ${
            r.ok ? "text-base-content/60" : "text-error"
          }`}
        >
          {r.text}
        </li>
      )),
    [rules]
  );

  return (
    <section className="space-y-3" aria-labelledby={`${sectionId}-title`}>
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-2">
            <h3 id={`${sectionId}-title`} className="text-lg font-semibold">
              {t("title")}
            </h3>
            <div className="badge badge-warning">{t("badge")}</div>
          </div>

          <form onSubmit={handleSubmit} className="mt-2 grid grid-cols-1">
            <PasswordField
              id={pwdCurrentId}
              label={t("current")}
              value={values.currentPwd}
              onChange={setters.setCurrentPwd}
              show={show.current}
              setShow={(v) =>
                setShow((s) => ({
                  ...s,
                  current: typeof v === "function" ? v(s.current) : v,
                }))
              }
              autoComplete="current-password"
            />

            <PasswordField
              id={pwdNewId}
              label={t("new")}
              value={values.newPwd}
              onChange={setters.setNewPwd}
              show={show.new1}
              setShow={(v) =>
                setShow((s) => ({
                  ...s,
                  new1: typeof v === "function" ? v(s.new1) : v,
                }))
              }
              autoComplete="new-password"
            />

            <PasswordField
              id={pwdNew2Id}
              label={t("newConfirm")}
              value={values.newPwd2}
              onChange={setters.setNewPwd2}
              show={show.new2}
              setShow={(v) =>
                setShow((s) => ({
                  ...s,
                  new2: typeof v === "function" ? v(s.new2) : v,
                }))
              }
              autoComplete="new-password"
            />

            <ul className="mt-1 space-y-1 text-xs">{ruleItems}</ul>

            {!flags.confirmOk && values.newPwd2.length > 0 && (
              <p className="text-xs text-error">{t("mismatch")}</p>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={!flags.canChangePwd || submitting}
                className={`btn btn-primary btn-block h-11 rounded-xl ${
                  submitting ? "loading" : ""
                }`}
                aria-disabled={!flags.canChangePwd || submitting}
                aria-busy={submitting}
              >
                {submitting ? t("submitting") : t("submit")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
