// src/app/[locale]/(site)/menu/group/hooks/useTeamList.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiOkTeam, ApiReferralGroupSummary } from "@/types/team";
import { useTranslations } from "next-intl";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasOkTrue(v: unknown): v is { ok: true } {
  return isRecord(v) && v.ok === true;
}

export type UseTeamListState = {
  loading: boolean;
  error: string | null;
  userLevel: number | null;
  referralGroups: ApiReferralGroupSummary[];
  hasGroups: boolean;
};

export type UseTeamListReturn = UseTeamListState & {
  reload: () => Promise<void>;
};

export function useTeamList(): UseTeamListReturn {
  const t = useTranslations("menu.group");

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [referralGroups, setReferralGroups] = useState<
    ApiReferralGroupSummary[]
  >([]);

  const fetchTeam = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/team/list", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });
      const text = await r.text();
      let j: unknown = null;
      try {
        j = JSON.parse(text);
      } catch {
        /* ignore */
      }

      if (!r.ok || !hasOkTrue(j)) {
        const msg =
          (isRecord(j) && typeof j.message === "string" && j.message) ||
          t("errors.fetchFailed", { status: r.status });
        throw new Error(msg);
      }

      const data = j as ApiOkTeam;
      setUserLevel(typeof data.userLevel === "number" ? data.userLevel : null);
      setReferralGroups(
        Array.isArray(data.referralGroups) ? data.referralGroups : []
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.network"));
      setUserLevel(null);
      setReferralGroups([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchTeam();
  }, [fetchTeam]);

  const hasGroups = useMemo(
    () => Array.isArray(referralGroups) && referralGroups.length > 0,
    [referralGroups]
  );

  return {
    loading,
    error,
    userLevel,
    referralGroups,
    hasGroups,
    reload: fetchTeam,
  };
}
