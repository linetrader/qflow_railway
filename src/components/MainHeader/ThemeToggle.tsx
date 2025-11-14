// src/components/MainHeader/ThemeToggle.tsx
"use client";

import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/components/MainHeader/hooks/useTheme";

type Theme = string;
type Size = "xs" | "sm" | "md";

type Props = {
  size?: Size;
  fullWidth?: boolean;
  className?: string;
};

function sizeClass(size: Size): string {
  return size === "xs"
    ? "toggle-xs"
    : size === "sm"
    ? "toggle-sm"
    : "toggle-md";
}

function readPairFromDOM(): { light: Theme | null; dark: Theme | null } {
  const root = document.documentElement;
  const light = root.getAttribute("data-theme-light");
  const dark = root.getAttribute("data-theme-dark");
  return {
    light: light && light.trim() !== "" ? (light as Theme) : null,
    dark: dark && dark.trim() !== "" ? (dark as Theme) : null,
  };
}

export default function ThemeToggle({
  size = "sm",
  fullWidth = false,
  className = "",
}: Props) {
  const t = useTranslations("common");
  const { mounted, theme, apply } = useTheme();
  const renderCount = useRef<number>(0);
  const [pair, setPair] = useState<{
    light: Theme | null;
    dark: Theme | null;
  } | null>(null);

  useEffect(() => {
    if (!mounted) return;
    const p = readPairFromDOM();
    setPair(p);
    console.info("[theme][CLIENT] toggle init", { theme, pair: p });
  }, [mounted, theme]);

  useEffect(() => {
    renderCount.current += 1;
    console.debug("[theme][CLIENT] toggle render", {
      renderCount: renderCount.current,
      mounted,
      theme,
      pair,
    });
  }, [mounted, theme, pair]);

  if (!mounted || !pair) {
    return (
      <div
        className={`skeleton h-8 ${fullWidth ? "w-full" : "w-24"} ${className}`}
        aria-hidden
      />
    );
  }

  const canToggle = pair.light !== null && pair.dark !== null && theme !== null;
  const checked = canToggle ? theme === pair.dark : false;

  const onChange = async (v: boolean): Promise<void> => {
    if (!canToggle) return;
    const next: Theme = v ? (pair.dark as Theme) : (pair.light as Theme);
    console.info("[theme][CLIENT] toggle change", { prev: theme, next });
    await apply(next);
  };

  return (
    <label
      className={`inline-flex items-center gap-2 ${
        fullWidth ? "w-full justify-between" : ""
      } ${className}`}
    >
      <SunIcon className="h-4 w-4 opacity-80" aria-hidden />
      <input
        type="checkbox"
        className={`toggle toggle-primary ${sizeClass(size)}`}
        role="switch"
        aria-label={t("theme.toggleAria")}
        aria-checked={checked}
        checked={checked}
        onChange={(e) => void onChange(e.target.checked)}
        disabled={!canToggle}
        title={canToggle ? "" : t("theme.missingCandidates")}
      />
      <MoonIcon className="h-4 w-4 opacity-80" aria-hidden />
    </label>
  );
}
