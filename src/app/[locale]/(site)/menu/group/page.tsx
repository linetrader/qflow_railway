// src/app/[locale]/(site)/menu/group/page.tsx
"use client";

import { useEffect } from "react";
import LevelAndGroupTotalsView from "./views/LevelAndGroupTotalsView";
import { useTeamList } from "./hooks/useTeamList";
import { useToast } from "@/components/ui/feedback/Toast-provider";
import { useTranslations } from "next-intl";

export default function TeamListPage() {
  const t = useTranslations("menu.group");
  const { loading, error, userLevel, referralGroups, hasGroups } =
    useTeamList();
  const { toast } = useToast();

  // 오류 토스트
  useEffect(() => {
    if (error) {
      toast({
        title: t("toast.errorTitle"),
        description: error,
        variant: "error",
        position: "top-right",
        duration: 2200,
        closable: true,
      });
    }
  }, [error, toast, t]);

  return (
    <main className="mx-auto max-w-screen-md px-4 pt-4 pb-24">
      {loading ? (
        <section className="space-y-2">
          <div className="badge badge-info">{t("loading.badge")}</div>
          <div className="card">
            <div className="card-body">
              <progress
                className="progress w-full"
                aria-label={t("loading.ariaProgress")}
              />
            </div>
          </div>
        </section>
      ) : error ? (
        <section className="space-y-2">
          <div className="card">
            <div className="card-body">
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <LevelAndGroupTotalsView
            userLevel={userLevel}
            referralGroups={referralGroups}
          />
          {!hasGroups && (
            <section className="mt-3">
              <div className="alert">
                <span>{t("empty.noGroups")}</span>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
