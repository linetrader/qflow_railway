"use client";

import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  HomeIcon,
  CreditCardIcon,
  CubeIcon,
  GiftIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type TabKey = "wallet" | "pkg" | "home" | "reward" | "self-signup";
type Tab = { href: string; labelKey: string; key: TabKey; Icon: IconComponent };

export default function MainFooter() {
  const t = useTranslations("common");
  const pathname = usePathname();

  const tabs: ReadonlyArray<Tab> = [
    {
      href: "/wallet",
      labelKey: "nav.wallet",
      key: "wallet",
      Icon: CreditCardIcon,
    },
    { href: "/packages", labelKey: "nav.packages", key: "pkg", Icon: CubeIcon },
    { href: "/", labelKey: "nav.home", key: "home", Icon: HomeIcon },
    { href: "/reward", labelKey: "nav.reward", key: "reward", Icon: GiftIcon },
    {
      href: "/self-signup",
      labelKey: "nav.signup",
      key: "self-signup",
      Icon: UserPlusIcon,
    },
  ];

  const isActive = (href: string): boolean =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label={t("nav.bottomAria")}
      className="fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-base-300 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5">
        {tabs.map(({ href, labelKey, key, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={key}
              href={href}
              aria-label={t(labelKey)}
              aria-current={active ? "page" : undefined}
              className={`
                flex flex-col items-center justify-center gap-1
                py-2 min-h-12
                ${
                  active
                    ? "text-primary"
                    : "text-base-content/80 hover:text-base-content"
                }
              `}
            >
              <Icon
                className={key === "home" ? "h-6 w-6" : "h-5 w-5"}
                aria-hidden
              />
              <span className="text-xs">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
