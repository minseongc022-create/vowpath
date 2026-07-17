"use client";

import { settingsPage } from "@/lib/content";

type Props = {
  steps: string[];
};

export function ForwardingSimpleSteps({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-lg font-bold text-slate-900">{settingsPage.forwardingDoNowTitle}</p>
      <p className="mt-0.5 text-base leading-snug text-slate-600">{settingsPage.forwardingDoNowHint}</p>
      <ol className="mt-3 space-y-3 sm:mt-4">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white sm:h-9 sm:w-9 sm:text-lg"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <p className="pt-0.5 text-base leading-snug text-slate-800 sm:leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
