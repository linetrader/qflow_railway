// src/components/MainHeader/LanguageSwitcher.tsx
"use client";

import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/routing";
import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  persist?: boolean;
};

type Option = Readonly<{
  code: AppLocale;
  abbr: string; // KO, EN, JP ...
  fullLabel: string; // 한국어, English ...
}>;

const OPTIONS: readonly Option[] = [
  { code: "ko", abbr: "KO", fullLabel: "한국어" },
  { code: "en", abbr: "EN", fullLabel: "English" },
  { code: "ja", abbr: "JP", fullLabel: "日本語" },
  { code: "zh", abbr: "ZH", fullLabel: "中文" },
  { code: "vi", abbr: "VI", fullLabel: "Tiếng Việt" },
] as const;

// URLSearchParams -> Record<string, string>
function qsToObject(qs: URLSearchParams): Record<string, string> {
  const o: Record<string, string> = {};
  qs.forEach((v, k) => {
    o[k] = v;
  });
  return o;
}

export default function LanguageSwitcher({ persist = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const currentLocale = useLocale() as AppLocale;

  const current = OPTIONS.find((o) => o.code === currentLocale) ?? OPTIONS[0];

  const apply = (next: AppLocale): void => {
    if (next === currentLocale) return;

    const query = qsToObject(search);

    router.replace({ pathname, query }, { locale: next });

    if (persist) router.refresh();
  };

  const AbbrBadge = ({ text }: { text: string }) => (
    <span className="text-[10px] font-semibold leading-none rounded px-1.5 py-0.5 border border-base-300 bg-base-200 text-base-content/80">
      {text}
    </span>
  );

  return (
    <div className="dropdown w-full">
      {/* 트리거 버튼: 이제 btn-outline 아님 -> 테두리 사라짐 */}
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-square h-9 min-h-9"
        aria-haspopup="listbox"
        aria-label={`Language: ${current.fullLabel}`}
      >
        <GlobeAltIcon className="h-5 w-5" aria-hidden />
      </button>

      <ul
        tabIndex={0}
        role="listbox"
        className="dropdown-content menu z-[60] mt-2 w-48 rounded-box border border-base-300 bg-base-100 p-2 shadow"
      >
        {OPTIONS.map((op) => (
          <li
            key={op.code}
            role="option"
            aria-selected={op.code === currentLocale}
          >
            <button
              type="button"
              className={`flex items-center gap-2 ${
                op.code === currentLocale ? "font-semibold" : ""
              }`}
              onClick={() => apply(op.code)}
            >
              <AbbrBadge text={op.abbr} />
              <span className="text-sm">{op.fullLabel}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
