// src/hooks/useLanguage.ts
"use client";

import type { LangCode, LangOption } from "@/types/layout/header";
import { useCallback, useEffect, useMemo, useState } from "react";
//import type { LangCode, LangOption } from "@/types/site/prefs/lang";

const OPTIONS: LangOption[] = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

export function useLanguage(defaultValue: LangCode = "ko", persist = true) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [code, setCode] = useState<LangCode>(defaultValue);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("lang") as LangCode | null;
      const next =
        saved && OPTIONS.some((l) => l.code === saved) ? saved : defaultValue;
      setCode(next);
      if (persist) document.documentElement.setAttribute("lang", next);
    } catch {
      setCode(defaultValue);
      if (persist) document.documentElement.setAttribute("lang", defaultValue);
    }
  }, [defaultValue, persist]);

  useEffect(() => {
    if (persist) document.documentElement.setAttribute("lang", code);
  }, [code, persist]);

  const current = useMemo<LangOption>(
    () => OPTIONS.find((l) => l.code === code) ?? OPTIONS[0],
    [code]
  );

  const apply = useCallback(
    (next: LangCode) => {
      setCode(next);
      if (persist) {
        try {
          localStorage.setItem("lang", next);
        } catch {}
        document.documentElement.setAttribute("lang", next);
      }
    },
    [persist]
  );

  return { mounted, code, current, options: OPTIONS, apply } as const;
}
