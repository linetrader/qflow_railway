// next-intl.config.ts
export const locales = ["ko", "en", "ja", "zh", "vi"] as const;
export type AppLocale = (typeof locales)[number];
export default {
  locales: Array.from(locales),
  defaultLocale: "ko" as AppLocale,
};
