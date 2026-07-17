"use client";

import { useCallback, useState } from "react";
import { settingsPage } from "@/lib/content";
import { formatUsPhoneE164, formatUsPhoneNational } from "@/lib/phone-display";

type Props = {
  phoneNumber: string;
  /** overflow = paste into carrier/VoIP; dedicated = publish as main line */
  mode: "overflow" | "dedicated";
  compact?: boolean;
};

export function EffiroadNumberBanner({ phoneNumber, mode, compact = false }: Props) {
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

  return (
    <div
      className={`rounded-xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
        {mode === "dedicated" ? c.badgeDedicated : c.badgeOverflow}
      </p>
      <p className={`mt-2 font-bold text-brand-950 ${compact ? "text-base" : "text-lg"}`}>
        {mode === "dedicated" ? c.titleDedicated : c.titleOverflow}
      </p>
      {!compact ? (
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-700">
          {mode === "dedicated" ? c.bodyDedicated : c.bodyOverflow}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p
          className={`font-mono font-bold tracking-tight text-brand-950 ${
            compact ? "text-2xl" : "text-3xl sm:text-4xl"
          }`}
        >
          {national}
        </p>
        <button
          type="button"
          onClick={() => void copyNumber()}
          className="rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 shadow-sm hover:bg-brand-50"
        >
          {copied ? settingsPage.forwardingCopied : settingsPage.forwardingCopy}
        </button>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {mode === "dedicated" ? c.noteDedicated : c.noteOverflow}
      </p>
      {mode === "overflow" ? (
        <p className="mt-1 text-xs text-slate-500">
          {c.carrierPasteHint.replace("{e164}", e164)}
        </p>
      ) : null}
    </div>
  );
}
