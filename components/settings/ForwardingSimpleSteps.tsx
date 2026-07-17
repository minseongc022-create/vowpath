"use client";

import { settingsPage } from "@/lib/content";

type Props = {
  steps: string[];
};

export function ForwardingSimpleSteps({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <p className="text-base font-bold text-slate-900 sm:text-lg">{settingsPage.forwardingDoNowTitle}</p>
      <p className="mt-1 text-sm leading-snug text-slate-600">{settingsPage.forwardingDoNowHint}</p>
      <ol className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-2.5 sm:gap-3">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white sm:h-8 sm:w-8"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <p className="pt-0.5 text-sm leading-snug text-slate-800 sm:text-base sm:leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
