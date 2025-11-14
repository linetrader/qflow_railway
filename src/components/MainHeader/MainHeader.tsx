// src/components/MainHeader/MainHeader.tsx
"use client";

import Image, { type StaticImageData } from "next/image";
import qFloLogo from "@/image/qflow-logo.png";
import dFloLogo from "@/image/dflow-logo.png";
import { UserCircleIcon, Bars3Icon } from "@heroicons/react/24/outline";
import type { MainHeaderProps } from "@/types/layout/header";
import { useHeaderMenu } from "./hooks/useHeaderMenu";
import MainMenuDrawer from "./MainMenuDrawer";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";

type LogoKey = "qflow" | "dflow";
const DEFAULT_LOGO: LogoKey = "qflow";

const logoMap: Record<
  LogoKey,
  { src: StaticImageData; alt: string; width: number }
> = {
  qflow: { src: qFloLogo, alt: "qflow", width: 100 },
  dflow: { src: dFloLogo, alt: "D Flow", width: 120 },
};

function normalizeLogoKey(input: string | null): LogoKey {
  const v = (input ?? "").trim().toLowerCase();
  return v === "dflow" ? "dflow" : "qflow";
}

export default function MainHeader({
  authed = false,
  userLevel = 0,
}: MainHeaderProps) {
  const t = useTranslations("common");
  const { state, items, setOpen, handleLogout } = useHeaderMenu(
    authed,
    userLevel
  );
  const [logoKey, setLogoKey] = useState<LogoKey>(DEFAULT_LOGO);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/theme", {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { logoImage: string | null };
        if (cancelled) return;
        setLogoKey(normalizeLogoKey(data.logoImage));
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { src, alt, width } = useMemo(() => logoMap[logoKey], [logoKey]);

  return (
    <header className="sticky top-0 z-50 border-b border-base-300 bg-base-100/95 backdrop-blur">
      <div className="navbar h-14 text-base-content container mx-auto px-3">
        <div className="navbar-start">
          <Link
            href="/"
            aria-label={t("nav.homeAria")}
            className="inline-flex items-center gap-2"
          >
            <div className="relative h-8 shrink-0" style={{ width }}>
              <Image
                src={src}
                alt={alt}
                fill
                priority
                className="object-cover object-left"
                sizes={`${width}px`}
              />
            </div>
          </Link>
        </div>

        <div className="navbar-end ml-auto items-center gap-2">
          {/* 데스크탑 전용 영역 */}
          <div className="hidden sm:flex items-center gap-2">
            {Number(userLevel) >= 21 && (
              <Link
                href="/admin"
                aria-label={t("admin.title")}
                className="btn btn-sm btn-outline"
              >
                {t("admin.title")}
              </Link>
            )}

            {/* 언어 스위처: 프로필 아이콘(또는 로그인 버튼들) 왼쪽 */}
            <LanguageSwitcher />

            {!authed ? (
              <>
                <Link
                  href="/auth/login"
                  aria-label={t("auth.login")}
                  className="btn btn-sm btn-outline"
                >
                  {t("auth.login")}
                </Link>
                <Link
                  href="/auth/signup"
                  aria-label={t("auth.signup")}
                  className="btn btn-sm btn-primary"
                >
                  {t("auth.signup")}
                </Link>
              </>
            ) : (
              <Link
                href="/account"
                aria-label={t("header.account")}
                className="btn btn-ghost btn-square"
              >
                <UserCircleIcon className="h-5 w-5" aria-hidden />
              </Link>
            )}
          </div>

          {/* 모바일 전용 영역 */}
          <div className="flex sm:hidden items-center gap-2">
            {/* 모바일에서도 프로필 아이콘 왼쪽에 배치 */}
            <LanguageSwitcher />

            {!authed ? (
              <>
                <Link
                  href="/auth/login"
                  aria-label={t("auth.login")}
                  className="btn btn-xs btn-outline"
                >
                  {t("auth.login")}
                </Link>
                <Link
                  href="/auth/signup"
                  aria-label={t("auth.signup")}
                  className="btn btn-xs btn-primary"
                >
                  {t("auth.signup")}
                </Link>
              </>
            ) : (
              <Link
                href="/account"
                aria-label={t("header.account")}
                className="btn btn-ghost btn-square"
              >
                <UserCircleIcon className="h-5 w-5" aria-hidden />
              </Link>
            )}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-square"
            aria-label={t("menu.open")}
            aria-haspopup="menu"
            aria-expanded={state.open}
            onClick={() => setOpen((prev) => !prev)}
          >
            <Bars3Icon className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <MainMenuDrawer
        open={state.open}
        setOpen={setOpen}
        authed={state.authed}
        publicItems={items.publicItems}
        privateItems={items.privateItems}
        onLogout={handleLogout}
      />
    </header>
  );
}
