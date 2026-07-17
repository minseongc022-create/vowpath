"use client";

import { settingsPage } from "@/lib/content";

type Props = {
  steps: string[];
};

export function ForwardingSimpleSteps({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-lg font-bold text-slate-900">{settingsPage.forwardingDoNowTitle}</p>
      <p className="mt-1 text-base text-slate-600">{settingsPage.forwardingDoNowHint}</p>
      <ol className="mt-5 space-y-4">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <p className="pt-1 text-base leading-relaxed text-slate-800">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
