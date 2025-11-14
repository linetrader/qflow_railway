// src/components/MainHeader/hooks/useHeaderMenu.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MenuItem } from "@/types/layout/header";

export function useHeaderMenu(authed: boolean, userLevel: number) {
  const pathname = usePathname();
  const t = useTranslations("common");
  const [open, setOpen] = useState<boolean>(false);
  const isManager = Number(userLevel) >= 21;

  useEffect(() => {
    setOpen(false); // 경로 변경 시 메뉴 자동 닫기
  }, [pathname]);

  const publicItems = useMemo<MenuItem[]>(
    () => [
      { href: "/menu/overview", label: t("menu.public.overview") },
      { href: "/menu/announcement", label: t("menu.public.announcement") },
      { href: "/menu/event", label: t("menu.public.event") },
      { href: "/menu/help", label: t("menu.public.help") },
    ],
    [t]
  );

  const privateItems = useMemo<MenuItem[]>(
    () => [
      {
        href: "/menu/group",
        label: t("menu.private.group"),
        requireAuth: true,
      },
      {
        href: "/menu/ranking",
        label: t("menu.private.ranking"),
        requireAuth: true,
      },
      { href: "/account", label: t("menu.private.account"), requireAuth: true },
    ],
    [t]
  );

  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      setOpen(false);
      window.location.assign("/");
    }
  }, []);

  return {
    state: { open, isManager, authed },
    items: { publicItems, privateItems },
    setOpen,
    handleLogout,
  } as const;
}
