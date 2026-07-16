"use client";

import { useCallback, useState } from "react";
import { settingsPage } from "@/lib/content";

type Props = {
  phoneNumber: string;
  variant?: "promo" | "fallback";
  onSwitchToDedicated?: () => void;
  compact?: boolean;
};

function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const n = digits.slice(1);
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  return e164;
}

export function EffiroadDedicatedLineCard({
  phoneNumber,
  variant = "promo",
  onSwitchToDedicated,
  compact = false,
}: Props) {
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
      className={`rounded-xl border-2 p-4 sm:p-5 ${
        isFallback
          ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-white shadow-sm"
          : "border-emerald-200 bg-emerald-50/50"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
        {isFallback ? c.fallbackBadge : c.badge}
      </p>
      <p className="mt-2 text-lg font-bold text-emerald-950">
        {isFallback ? c.fallbackTitle : c.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-emerald-900/90">
        {isFallback ? c.fallbackBody : c.body}
      </p>
      <p className="mt-2 rounded-lg border border-emerald-300/60 bg-white/60 px-3 py-2 text-sm font-medium text-emerald-900">
        {c.equalQualityNote}
      </p>

      {!compact ? (
        <ul className="mt-4 space-y-2">
          {features.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed text-emerald-900">
              <span className="mt-0.5 text-emerald-600" aria-hidden="true">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
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
