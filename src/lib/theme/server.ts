// src/lib/theme/server.ts
import { cookies } from "next/headers";
import type { Theme } from "@/app/api/theme/route"; // Theme = string

// ✅ API 라우트와 동일한 통합 쿠키 키로 통일
const COOKIE_KEY_THEME = "COOKIE_KEY_THEME";

type LogoImage = string;

type CombinedCookie = {
  theme: Theme | null;
  logoImage: LogoImage | null;
};

function nz(v: string | undefined | null): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

/**
 * ✅ 통합 쿠키(JSON) 파서 (레거시 문자열 호환)
 * - { "theme": "xxx", "logoImage": "yyy" } 형태 우선
 * - 문자열만 있던 레거시 값도 허용
 * - 파싱 실패 시 nulls
 */
function parseCombined(raw: string | undefined | null): CombinedCookie {
  if (!raw) return { theme: null, logoImage: null };
  try {
    const obj = JSON.parse(raw) as unknown;
    if (
      typeof obj === "object" &&
      obj !== null &&
      "theme" in obj &&
      "logoImage" in obj
    ) {
      const t = (obj as { theme: unknown }).theme;
      const l = (obj as { logoImage: unknown }).logoImage;
      return {
        theme: typeof t === "string" ? (t as Theme) : null,
        logoImage: typeof l === "string" ? (l as LogoImage) : null,
      };
    }
    // 레거시: 단일 문자열(테마만)
    if (typeof obj === "string") {
      return { theme: obj as Theme, logoImage: null };
    }
  } catch {
    // JSON 파싱 실패 → 레거시: 그 자체가 theme 문자열일 수 있음
    if (typeof raw === "string")
      return { theme: raw as Theme, logoImage: null };
  }
  return { theme: null, logoImage: null };
}

/** SSR에서 초기 data-theme 값 선정: (통합쿠키.theme) > (env THEME_DEFAULT) > null */
export async function getInitialTheme(): Promise<Theme | null> {
  const store = await cookies();

  // ✅ 통합 쿠키만 읽는다(SSR과 API 라우트의 규칙 통일)
  const combined = parseCombined(store.get(COOKIE_KEY_THEME)?.value ?? null);

  // ENV 기본값
  const envDefault = nz(process.env.THEME_DEFAULT);

  const initialTheme: Theme | null = combined.theme ?? envDefault;

  // 디버그 로그(선택)
  // console.info("[theme][SSR] initial (unified)", {
  //   cookieKey: COOKIE_KEY_THEME,
  //   cookieCombined: combined,
  //   envDefault,
  //   resultTheme: initialTheme,
  //   source:
  //     combined.theme !== null ? "cookie" : envDefault !== null ? "env" : "none",
  // });

  return initialTheme;
}
