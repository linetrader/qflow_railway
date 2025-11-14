// src/components/MainHeader/config/theme.ts
export type Theme = string;

export type ThemeConfig = {
  theme: Theme | null;
  light: Theme | null;
  dark: Theme | null;
  source: "cookie" | "env" | "none";
};

export async function fetchTheme(): Promise<ThemeConfig> {
  const res = await fetch("/api/theme", {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    return { theme: null, light: null, dark: null, source: "none" };
  }
  const data = (await res.json()) as ThemeConfig;
  return data;
}

export async function updateTheme(next: Theme): Promise<ThemeConfig> {
  const res = await fetch("/api/theme", {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ theme: next }),
  });
  if (!res.ok) {
    // 실패 시 현재 서버 상태 재조회
    return await fetchTheme();
  }
  const data = (await res.json()) as ThemeConfig;
  return data;
}
