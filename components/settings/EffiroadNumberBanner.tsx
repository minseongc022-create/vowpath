"use client";

import { useCallback, useState } from "react";
import { settingsPage } from "@/lib/content";
import { formatUsPhoneE164, formatUsPhoneNational } from "@/lib/phone-display";

type Props = {
  phoneNumber: string;
  /** overflow = paste into carrier/VoIP; dedicated = publish as main line */
  mode: "overflow" | "dedicated";
  /** card = full panel; bar = sticky one-line header for mobile scroll */
  layout?: "card" | "bar";
};

export function EffiroadNumberBanner({
  phoneNumber,
  mode,
  layout = "card",
}: Props) {
  const [copied, setCopied] = useState(false);
  const national = formatUsPhoneNational(phoneNumber);
  const e164 = formatUsPhoneE164(phoneNumber);
  const c = settingsPage.forwardingNumberBanner;

  const copyNumber = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(e164);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [e164]);

  if (layout === "bar") {
    return (
      <div className="rounded-lg border-2 border-brand-400 bg-white px-2.5 py-2 shadow-sm sm:rounded-xl sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700 sm:text-xs">
              {mode === "dedicated" ? c.badgeDedicated : c.badgeOverflow}
            </p>
            <p className="font-mono text-xl font-bold leading-none tracking-tight text-brand-950 sm:text-3xl">
              {national}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyNumber()}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 sm:px-4 sm:py-2.5 sm:text-base"
          >
            {copied ? settingsPage.forwardingCopied : settingsPage.forwardingCopy}
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-snug text-slate-700 sm:mt-2 sm:text-sm">
          {mode === "dedicated" ? c.noteDedicated : c.barHintOverflow}
        </p>
        {mode === "overflow" ? (
          <p className="mt-1 text-xs leading-snug text-slate-500 sm:text-sm">
            {c.carrierPasteHint.replace("{e164}", e164)}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
        {mode === "dedicated" ? c.badgeDedicated : c.badgeOverflow}
      </p>
      <p className="mt-1 text-base font-bold text-brand-950 sm:text-lg">
        {mode === "dedicated" ? c.titleDedicated : c.titleOverflow}
      </p>
      <p className="mt-2 text-base leading-snug text-slate-700 sm:max-w-2xl sm:leading-relaxed">
        {mode === "dedicated" ? c.bodyDedicated : c.bodyOverflow}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="font-mono text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
          {national}
        </p>
        <button
          type="button"
          onClick={() => void copyNumber()}
          className="rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-base font-semibold text-brand-800 shadow-sm hover:bg-brand-50"
        >
          {copied ? settingsPage.forwardingCopied : settingsPage.forwardingCopy}
        </button>
      </div>

      <p className="mt-2 text-base leading-snug text-slate-600">
        {mode === "dedicated" ? c.noteDedicated : c.noteOverflow}
      </p>
      {mode === "overflow" ? (
        <p className="mt-1 text-sm text-slate-500">
          {c.carrierPasteHint.replace("{e164}", e164)}
        </p>
      ) : null}
    </div>
  );
}
