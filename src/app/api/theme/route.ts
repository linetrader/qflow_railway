// src/app/api/theme/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export type Theme = string;
export type LogoImage = string;

const COOKIE_KEY_THEME = "COOKIE_KEY_THEME"; // ✅ 단일 쿠키 키

function nz(v: string | undefined | null): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

type CombinedCookie = {
  theme: Theme | null;
  logoImage: LogoImage | null;
};

type ThemePayload = {
  theme: Theme | null;
  logoImage: LogoImage | null;
  sourceTheme: "cookie" | "env" | "none";
  sourceLogo: "cookie" | "env" | "none";
  light: Theme | null; // ENV 후보
  dark: Theme | null; // ENV 후보
};

// 안전 파서: 과거 단일 문자열(테마만) 저장 호환
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
    // 문자열(테마 하나)만 저장되어 있던 레거시 값
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

function setCombinedCookie(res: NextResponse, value: CombinedCookie): void {
  res.cookies.set({
    name: COOKIE_KEY_THEME,
    value: JSON.stringify(value),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1y
  });
}

export async function GET(): Promise<Response> {
  const store = await cookies();
  const combined = parseCombined(store.get(COOKIE_KEY_THEME)?.value ?? null);

  // 서버 전용 ENV
  const envDefault = nz(process.env.THEME_DEFAULT); // theme 기본값
  const envLight = nz(process.env.THEME_LIGHT); // 후보: light
  const envDark = nz(process.env.THEME_DARK); // 후보: dark
  const envLogo = nz(process.env.THEME_LOGO_IMAGE); // logo

  // 규칙: .env와 다르면 .env(≠null) 우선 → 덮어쓰기
  const shouldOverwriteTheme =
    envDefault !== null && combined.theme !== envDefault;

  const shouldOverwriteLogo =
    envLogo !== null && combined.logoImage !== envLogo;

  // 응답값 계산
  const responseTheme: Theme | null = shouldOverwriteTheme
    ? envDefault
    : combined.theme ?? envDefault ?? null;

  const responseLogo: LogoImage | null = shouldOverwriteLogo
    ? envLogo
    : combined.logoImage ?? envLogo ?? null;

  // ---- DEBUG ----
  // console.info("[theme][GET] state", {
  //   cookieCombined: combined,
  //   envDefault,
  //   envLight,
  //   envDark,
  //   envLogo,
  //   shouldOverwriteTheme,
  //   shouldOverwriteLogo,
  //   resultTheme: responseTheme,
  //   resultLogo: responseLogo,
  //   sourceTheme: shouldOverwriteTheme
  //     ? "env"
  //     : combined.theme !== null
  //     ? "cookie"
  //     : envDefault !== null
  //     ? "env"
  //     : "none",
  //   sourceLogo: shouldOverwriteLogo
  //     ? "env"
  //     : combined.logoImage !== null
  //     ? "cookie"
  //     : envLogo !== null
  //     ? "env"
  //     : "none",
  // });

  const res = NextResponse.json<ThemePayload>(
    {
      theme: responseTheme,
      logoImage: responseLogo,
      sourceTheme: shouldOverwriteTheme
        ? "env"
        : combined.theme !== null
        ? "cookie"
        : envDefault !== null
        ? "env"
        : "none",
      sourceLogo: shouldOverwriteLogo
        ? "env"
        : combined.logoImage !== null
        ? "cookie"
        : envLogo !== null
        ? "env"
        : "none",
      light: envLight,
      dark: envDark,
    },
    { status: 200 }
  );

  // 쿠키 쓰기: 덮어쓰기 또는 (부재/값 변화 시) 동기화
  const want: CombinedCookie = {
    theme: responseTheme,
    logoImage: responseLogo,
  };
  const changed =
    want.theme !== combined.theme || want.logoImage !== combined.logoImage;

  if (shouldOverwriteTheme || shouldOverwriteLogo || changed) {
    // console.info("[theme][GET] set cookie(combined)", {
    //   key: COOKIE_KEY_THEME,
    //   value: want,
    //   reason:
    //     shouldOverwriteTheme || shouldOverwriteLogo
    //       ? "overwrite(env wins)"
    //       : "sync",
    // });
    setCombinedCookie(res, want);
  }

  return res;
}

type PostBody = {
  theme?: Theme; // 전달 시에만 갱신
  logoImage?: LogoImage; // 전달 시에만 갱신
};

export async function POST(req: Request): Promise<Response> {
  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    console.warn("[theme][POST] invalid json");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof bodyUnknown !== "object" || bodyUnknown === null) {
    console.warn("[theme][POST] invalid payload", { bodyUnknown });
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = bodyUnknown as PostBody;

  // 현재 쿠키 상태
  const store = await cookies();
  const combined = parseCombined(store.get(COOKIE_KEY_THEME)?.value ?? null);

  // 들어온 값 정규화
  const nextTheme = "theme" in body ? nz(body.theme ?? null) : null;
  const nextLogo = "logoImage" in body ? nz(body.logoImage ?? null) : null;

  const after: CombinedCookie = {
    theme:
      nextTheme !== null
        ? nextTheme
        : combined.theme ?? nz(process.env.THEME_DEFAULT),
    logoImage:
      nextLogo !== null
        ? nextLogo
        : combined.logoImage ?? nz(process.env.THEME_LOGO_IMAGE),
  };

  // console.info("[theme][POST] update", {
  //   before: combined,
  //   patch: { theme: nextTheme, logoImage: nextLogo },
  //   after,
  // });

  const res = NextResponse.json<ThemePayload>(
    {
      theme: after.theme ?? null,
      logoImage: after.logoImage ?? null,
      sourceTheme: after.theme !== null ? "cookie" : "none",
      sourceLogo: after.logoImage !== null ? "cookie" : "none",
      light: nz(process.env.THEME_LIGHT),
      dark: nz(process.env.THEME_DARK),
    },
    { status: 200 }
  );

  setCombinedCookie(res, after);
  return res;
}
