// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";

/** 지원 로케일 */
const LOCALES = ["ko", "en", "ja", "zh", "vi"] as const;
type AppLocale = (typeof LOCALES)[number];

/** 네임스페이스(슬래시 허용) */
const NAMESPACES = [
  "common",
  "home",
  "auth",
  "account",
  "packages",
  "reward",
  "selfSignup",
  "wallet",
  "wallet/deposit",
  "wallet/withdraw",
  "menu/announcement",
  "menu/group",
] as const;
type Namespace = (typeof NAMESPACES)[number];

/** 재귀 JSON 타입 (빈 인터페이스 제거) */
type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

/** 로케일 정규화 */
function normalizeLocale(input: string | undefined | null): AppLocale {
  const v = (input ?? "").toLowerCase();
  return (LOCALES as readonly string[]).includes(v) ? (v as AppLocale) : "ko";
}

/** 안전 import */
async function importMessages(
  lang: AppLocale,
  ns: Namespace
): Promise<{ [key: string]: JSONValue }> {
  try {
    // 경로 주의: 이 파일이 src/i18n/request.ts라면,
    // ./messages/... 는 src/i18n/messages 를 가리킵니다.
    // 실제 파일이 src/messages/... 라면 '../messages' 또는 '@/messages' 로 바꾸세요.
    const mod = await import(`./messages/${lang}/${ns}.json`);
    return mod.default as { [key: string]: JSONValue };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : typeof e === "string" ? e : "unknown";
    throw new Error(
      `i18n load error: locale='${lang}', ns='${ns}', reason='${msg}'`
    );
  }
}

/** 중첩 객체에 값 설정 */
function setNested(
  target: { [key: string]: JSONValue },
  path: readonly string[],
  value: { [key: string]: JSONValue }
): void {
  let cur = target;
  for (let i = 0; i < path.length; i++) {
    const key = path[i]!;
    if (i === path.length - 1) {
      cur[key] = value;
    } else {
      const next = cur[key];
      if (typeof next !== "object" || next === null || Array.isArray(next)) {
        cur[key] = {};
      }
      cur = cur[key] as { [key: string]: JSONValue };
    }
  }
}

export default getRequestConfig(async ({ locale }) => {
  const lang = normalizeLocale(locale);

  // 병렬 로드
  const loaded = await Promise.all(
    NAMESPACES.map((ns) => importMessages(lang, ns))
  );

  // 슬래시를 기준으로 중첩 주입
  const messages: { [key: string]: JSONValue } = {};
  NAMESPACES.forEach((ns, i) => {
    const segments = ns.split("/");
    setNested(messages, segments, loaded[i]);
  });

  return { locale: lang, messages };
});
