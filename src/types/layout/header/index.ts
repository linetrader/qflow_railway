// src/types/layout/header/index.ts
export type MainHeaderProps = {
  authed?: boolean;
  userLevel?: number;
};

export type MenuItem = {
  href: string;
  label: string;
  requireAuth?: boolean;
};

// src/types/site/prefs/lang.ts
export type LangCode = "ko" | "en" | "ja" | "zh" | "vi";
export type LangOption = { code: LangCode; label: string; flag: string };
