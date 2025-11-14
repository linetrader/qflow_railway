// src/app/layout.tsx
import "@/styles/index.css";
import React from "react";
import { headers } from "next/headers";
import { getInitialTheme } from "@/lib/theme/server";
import { ToastProvider } from "@/components/ui";

export default async function RootLayout(props: { children: React.ReactNode }) {
  // SSR에서 초기 테마 확정
  const initialTheme = await getInitialTheme();

  // 미들웨어가 넣은 로케일 헤더 사용(없으면 en)
  const h = await headers();
  const locale = h.get("x-next-intl-locale") ?? "en";

  // 토글에서 읽을 후보(환경변수 기준; 없으면 비움)
  const themeLight = process.env.THEME_LIGHT ?? "";
  const themeDark = process.env.THEME_DARK ?? "";

  return (
    <html
      lang={locale}
      data-theme={initialTheme ?? ""}
      data-theme-light={themeLight}
      data-theme-dark={themeDark}
      suppressHydrationWarning
    >
      <body
        className="m-0 min-h-dvh bg-base-200 text-base-content antialiased bgfx bgfx-glow"
        suppressHydrationWarning
      >
        {/* (선택) 첫 페인트 전에 localStorage 값으로 보정 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try{
    var t = localStorage.getItem('theme');
    if(t){ document.documentElement.setAttribute('data-theme', t); }
  }catch(e){}
})();`,
          }}
        />
        <ToastProvider>{props.children}</ToastProvider>
      </body>
    </html>
  );
}
