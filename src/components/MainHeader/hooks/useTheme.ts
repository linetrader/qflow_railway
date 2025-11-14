// src/components/MainHeader/hooks/useTheme.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchTheme,
  updateTheme,
  type Theme,
} from "@/components/MainHeader/config/theme";

type UseThemeResult = {
  mounted: boolean;
  theme: Theme | null;
  apply: (next: Theme) => Promise<void>;
};

export function useTheme(): UseThemeResult {
  const [mounted, setMounted] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cfg = await fetchTheme();
      console.info("[theme][CLIENT] fetched", cfg);

      if (!cancelled) {
        if (cfg.theme) {
          document.documentElement.setAttribute("data-theme", cfg.theme);
          if (cfg.light)
            document.documentElement.setAttribute(
              "data-theme-light",
              cfg.light
            );
          if (cfg.dark)
            document.documentElement.setAttribute("data-theme-dark", cfg.dark);
          console.info("[theme][CLIENT] applied to DOM", { theme: cfg.theme });
        }
        setTheme(cfg.theme);
        setMounted(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback(async (next: Theme): Promise<void> => {
    console.info("[theme][CLIENT] request update", { next });
    const cfg = await updateTheme(next);
    const applied = cfg.theme;
    console.info("[theme][CLIENT] updated result", cfg);

    if (applied) {
      document.documentElement.setAttribute("data-theme", applied);
      setTheme(applied);
      console.info("[theme][CLIENT] applied to DOM", { theme: applied });
    }
  }, []);

  return { mounted, theme, apply };
}
