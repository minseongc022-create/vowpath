"use client";

import { settingsPage } from "@/lib/content";

type Props = {
  steps: string[];
};

export function ForwardingSimpleSteps({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:rounded-xl sm:p-4">
      <p className="text-sm font-bold text-slate-900 sm:text-lg">{settingsPage.forwardingDoNowTitle}</p>
      <p className="mt-0.5 hidden text-sm leading-snug text-slate-600 sm:block">
        {settingsPage.forwardingDoNowHint}
      </p>
      <ol className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-2 sm:gap-3">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white sm:h-8 sm:w-8 sm:text-base"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <p className="pt-0 text-xs leading-snug text-slate-800 sm:pt-0.5 sm:text-base sm:leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
