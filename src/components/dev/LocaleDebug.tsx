// src/components/dev/LocaleDebug.tsx
"use client";

import { useLocale, useMessages, useTranslations } from "next-intl";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };
type JsonObject = { [k: string]: JsonValue };

/** 중첩 경로로 메시지 안전 조회 */
function getNested(
  obj: JsonObject | undefined,
  path: string[]
): JsonValue | undefined {
  let cur: unknown = obj;
  for (const key of path) {
    if (typeof cur !== "object" || cur === null) return undefined;
    if (
      !Object.prototype.hasOwnProperty.call(cur as Record<string, unknown>, key)
    )
      return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur as JsonValue | undefined;
}

export default function LocaleDebug() {
  const locale = useLocale();
  const messages = useMessages() as JsonObject; // 구조적 JSON 타입으로만 단언
  const tHome = useTranslations("home");
  const tAuth = useTranslations("auth");

  // 메시지 존재 시 그 값을, 없으면 t()로 번역(미존재 시 런타임 에러 방지됨)
  const homeTitle =
    (getNested(messages, ["home", "announcements", "title"]) as
      | string
      | undefined) ?? tHome("announcements.title");

  const authTitle =
    (getNested(messages, ["auth", "title"]) as string | undefined) ??
    tAuth("title");

  const payload = {
    locale,
    home_sample: homeTitle,
    auth_sample: authTitle,
  };

  return (
    <pre className="text-xs opacity-70">{JSON.stringify(payload, null, 2)}</pre>
  );
}
