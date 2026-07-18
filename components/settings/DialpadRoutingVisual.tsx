"use client";

import { useSettingsPage } from "@/components/providers/LocaleProvider";

const STEPS = [
  { title: "Main Line", detail: "Dialpad admin → Main Line" },
  { title: "Edit routing", detail: "Business Hours & Call Routing → Edit" },
  { title: "Fallback", detail: "External number → paste Effiroad → Save (Closed Hours too)" },
] as const;

/** Static light checklist — replaces dark animated mockup (hard to read on mobile). */
export function DialpadRoutingVisual() {
  const settingsPage = useSettingsPage();
  const v = settingsPage.forwardingDialpadVisual;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/80 p-3 sm:p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-800">{v.caption}</p>
      <p className="mt-1 text-sm leading-snug text-stone-700">{v.hint}</p>
      <ol className="mt-3 space-y-2">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex gap-2.5 rounded-lg border border-white bg-white px-3 py-2.5 shadow-sm"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-950">{step.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-stone-600 sm:text-sm">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
