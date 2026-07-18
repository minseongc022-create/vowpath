"use client";

import { AgreementKeeperSettingsEditor } from "@/components/settings/AgreementKeeperSettings";
import { GoogleReviewUrlEditor } from "@/components/settings/GoogleReviewUrlEditor";
import { useSettingsPage } from "@/components/providers/LocaleProvider";

type ShopOptionalFollowUpsProps = {
  reviewUrl?: string;
  onReviewUrlSaved: (url: string | undefined) => void;
};

export function ShopOptionalFollowUps({
  reviewUrl,
  onReviewUrlSaved,
}: ShopOptionalFollowUpsProps) {
  const copy = useSettingsPage().shopOptional;

  return (
    <details className="vow-settings-block rounded-xl border border-slate-200 bg-slate-50/50">
      <summary className="cursor-pointer list-none px-3 py-3 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-2">
          <span className="text-base" aria-hidden>
            ✨
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-brand-950">{copy.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-stone-600">{copy.summary}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-brand-700">{copy.expandLabel}</span>
        </div>
      </summary>

      <div className="space-y-3 border-t border-slate-200 px-3 pb-3 pt-2 sm:space-y-4 sm:px-5 sm:pb-5 sm:pt-3">
        <AgreementKeeperSettingsEditor />

        <GoogleReviewUrlEditor reviewUrl={reviewUrl} onSaved={onReviewUrlSaved} />

        <div className="rounded-xl border border-slate-100 bg-white p-3 sm:p-4">
          <p className="text-sm font-medium text-brand-900">{copy.smsTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{copy.smsBody}</p>
          <a
            href={copy.smsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-xs font-medium text-brand-700 underline"
          >
            {copy.smsLinkLabel}
          </a>
        </div>
      </div>
    </details>
  );
}
