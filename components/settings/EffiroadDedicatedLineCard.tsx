"use client";

import { useCallback, useState } from "react";
import { useSettingsPage } from "@/components/providers/LocaleProvider";
import { formatUsPhoneNational } from "@/lib/phone-display";

type Props = {
  phoneNumber: string;
  variant?: "promo" | "fallback";
  onSwitchToDedicated?: () => void;
  compact?: boolean;
};

function formatPhoneDisplay(e164: string): string {
  return formatUsPhoneNational(e164);
}

export function EffiroadDedicatedLineCard({
  phoneNumber,
  variant = "promo",
  onSwitchToDedicated,
  compact = false,
}: Props) {
  const settingsPage = useSettingsPage();
  const [copied, setCopied] = useState(false);
  const c = settingsPage.forwardingDedicatedLine;
  const isFallback = variant === "fallback";
  const features: readonly string[] = c.features;

  const copyNumber = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [phoneNumber]);

  return (
    <div
      className={`rounded-xl border-2 p-3 sm:p-5 ${
        isFallback
          ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-white shadow-sm"
          : "border-emerald-200 bg-emerald-50/50"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
        {isFallback ? c.fallbackBadge : c.badge}
      </p>
      <p className="mt-1.5 text-base font-bold text-emerald-950 sm:mt-2 sm:text-lg">
        {isFallback ? c.fallbackTitle : c.title}
      </p>
      <p className="mt-1.5 text-sm leading-snug text-emerald-900/90 sm:mt-2 sm:leading-relaxed">
        {isFallback ? c.fallbackBody : c.body}
      </p>
      <p className="mt-2 rounded-lg border border-emerald-300/60 bg-white/60 px-3 py-2 text-sm font-medium leading-snug text-emerald-900">
        {c.equalQualityNote}
      </p>

      <ul className={`mt-3 space-y-1.5 ${compact ? "sm:mt-4 sm:space-y-2" : "mt-4 space-y-2"}`}>
        {features.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-snug text-emerald-900 sm:leading-relaxed">
            <span className="mt-0.5 text-emerald-600" aria-hidden="true">
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4 sm:gap-3">
        <p className="font-mono text-xl font-bold tracking-tight text-brand-950">
          {formatPhoneDisplay(phoneNumber)}
        </p>
        <button
          type="button"
          onClick={() => void copyNumber()}
          className="rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          {copied ? settingsPage.forwardingCopied : settingsPage.forwardingCopy}
        </button>
      </div>

      {onSwitchToDedicated ? (
        <button
          type="button"
          onClick={onSwitchToDedicated}
          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-500 sm:w-auto"
        >
          {c.switchButton}
        </button>
      ) : null}

      <p className="mt-3 text-xs text-emerald-800/80">{c.footer}</p>
    </div>
  );
}
