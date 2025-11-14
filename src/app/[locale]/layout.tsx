// src/app/[locale]/layout.tsx
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getMessages } from "next-intl/server";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

const LOCALES = ["ko", "en", "ja", "zh", "vi"] as const;
type AppLocale = (typeof LOCALES)[number];
function normalizeLocale(input: string | undefined | null): AppLocale {
  const v = (input ?? "").toLowerCase();
  return (LOCALES as readonly string[]).includes(v as AppLocale)
    ? (v as AppLocale)
    : "ko";
}

export function generateStaticParams(): Array<{ locale: AppLocale }> {
  return LOCALES.map((l) => ({ locale: l }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const lang = normalizeLocale(locale);

  // 1) 라우트 파라미터 기반으로 RSC 트리의 로케일 컨텍스트 설정
  setRequestLocale(lang); // Docs: setRequestLocale(API). :contentReference[oaicite:1]{index=1}

  // 2) 협상값이 아닌 '명시적' locale로 메시지 로드
  const messages = await getMessages({ locale: lang }); // Docs: getMessages로 locale 지정. :contentReference[oaicite:2]{index=2}

  // 3) Provider에도 locale을 명시 (상속 대신 확정)
  return (
    <NextIntlClientProvider
      locale={lang}
      messages={messages}
      timeZone="Asia/Seoul"
    >
      {children}
    </NextIntlClientProvider>
  );
}
