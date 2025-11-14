// src/i18n/routing.ts
import { createNavigation } from "next-intl/navigation";

export const locales = ["ko", "en", "ja", "zh", "vi"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "ko";

export const { Link, useRouter, usePathname, redirect } = createNavigation({
  locales,
  defaultLocale,
});
