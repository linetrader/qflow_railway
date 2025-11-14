// src/components/MainHeader/MainMenuDrawer.tsx
"use client";

import {
  ChevronRightIcon,
  CircleStackIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import type { MenuItem } from "@/types/layout/header";
import ThemeToggle from "./ThemeToggle";
// LanguageSwitcher 제거
import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

type Props = {
  open: boolean;
  setOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  authed: boolean;
  publicItems: MenuItem[];
  privateItems: MenuItem[];
  onLogout: () => void;
};

export default function MainMenuDrawer({
  open,
  setOpen,
  authed,
  publicItems,
  privateItems,
  onLogout,
}: Props) {
  const t = useTranslations("common");

  useEffect(() => {
    if (open) document.documentElement.classList.add("overflow-hidden");
    else document.documentElement.classList.remove("overflow-hidden");
    return () => document.documentElement.classList.remove("overflow-hidden");
  }, [open]);

  return (
    <div className={`drawer drawer-end ${open ? "drawer-open" : ""} z-[60]`}>
      <input
        id="mainmenu-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={open}
        readOnly
      />

      <div className="drawer-side" aria-label={t("menu.drawerAria")}>
        <label
          htmlFor="mainmenu-drawer"
          className="drawer-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <aside className="menu w-80 max-w-[90vw] min-h-full bg-base-100 border-l border-base-300 p-3">
          <div className="px-2 py-2 mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("menu.title")}</h2>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setOpen(false)}
              aria-label={t("actions.close")}
            >
              {t("actions.close")}
            </button>
          </div>

          <ul role="menu">
            {publicItems.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2"
                  onClick={() => setOpen(false)}
                >
                  <CircleStackIcon
                    className="h-5 w-5 text-primary"
                    aria-hidden
                  />
                  <span className="leading-none">{it.label}</span>
                  <ChevronRightIcon
                    className="ml-auto h-5 w-5 text-base-content/60"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>

          {authed && (
            <>
              <div className="my-2 border-t border-base-300" />
              <div className="px-2 py-1">
                <span className="menu-title">{t("menu.account")}</span>
              </div>
              <ul role="menu">
                {privateItems.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2"
                      onClick={() => setOpen(false)}
                    >
                      <CircleStackIcon
                        className="h-5 w-5 text-primary"
                        aria-hidden
                      />
                      <span className="leading-none">{it.label}</span>
                      <ChevronRightIcon
                        className="ml-auto h-5 w-5 text-base-content/60"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-2 px-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLogout();
                    setOpen(false);
                  }}
                  className="btn btn-error btn-outline w-full justify-start gap-2"
                  aria-label={t("auth.logout")}
                  title={t("auth.logout")}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden />
                  <span>{t("auth.logout")}</span>
                </button>
              </div>
            </>
          )}

          <div className="my-2 border-t border-base-300" />
          <div className="px-2 py-1">
            <span className="menu-title">{t("menu.settings")}</span>
          </div>
          <div className="px-2 py-2">
            <ThemeToggle size="sm" fullWidth />
          </div>

          {/* LanguageSwitcher 블록 완전히 삭제됨 */}
        </aside>
      </div>
    </div>
  );
}
