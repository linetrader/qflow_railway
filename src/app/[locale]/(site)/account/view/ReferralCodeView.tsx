// src/app/[locale]/(site)/account/view/ReferralCodeView.tsx
"use client";

import { useTranslations } from "next-intl";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";

export function ReferralCodeView(props: {
  refLink: string;
  onCopy: () => void;
}) {
  const { refLink, onCopy } = props;
  const hasLink = refLink.length > 0;
  const t = useTranslations("account.referral");
  const tCommon = useTranslations("common.actions");

  return (
    <section className="space-y-3">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{t("title")}</h3>
            <div className="badge badge-info">{t("badge")}</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-base-content/20 bg-base-100 px-3 py-2">
              <p className="font-mono text-sm select-all break-all">
                {hasLink ? refLink : "-"}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCopy}
              aria-label={tCommon("copy")}
              title={tCommon("copy")}
              disabled={!hasLink}
            >
              <ClipboardDocumentIcon className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
