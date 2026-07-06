"use client";

import { useState } from "react";

/**
 * Small always-available help affordance: an ⓘ icon that reveals a short
 * explanation on hover (desktop) or tap (touch). Use next to any feature,
 * stat, or setting so shop owners can re-learn what something does without
 * needing the full guided tour again.
 */
export function HelpTip({
  text,
  label = "도움말",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-brand-300 bg-brand-50 text-[10px] font-bold leading-none text-brand-600 transition hover:border-brand-400 hover:bg-brand-100"
      >
        i
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-50 w-56 -translate-x-1/2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-left text-xs font-normal leading-relaxed text-stone-700 shadow-xl"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
