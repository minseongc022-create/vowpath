"use client";

import type { ReactNode } from "react";

type GoLiveStepProps = {
  step: string;
  title: string;
  description: string;
  done: boolean;
  optional?: boolean;
  skipped?: boolean;
  doneLabel: string;
  pendingLabel: string;
  optionalLabel: string;
  skippedLabel: string;
  children: ReactNode;
};

export function GoLiveStep({
  step,
  title,
  description,
  done,
  optional,
  skipped,
  doneLabel,
  pendingLabel,
  optionalLabel,
  skippedLabel,
  children,
}: GoLiveStepProps) {
  const statusLabel = done
    ? doneLabel
    : skipped
      ? skippedLabel
      : optional
        ? optionalLabel
        : pendingLabel;

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        done ? "border-emerald-200" : "border-brand-200/70"
      }`}
    >
      <div
        className={`flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 sm:px-6 ${
          done ? "border-emerald-100 bg-emerald-50/60" : "border-brand-100 bg-brand-50/40"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="vow-settings-eyebrow">{step}</p>
          <h3 className="mt-1 text-xl font-semibold text-brand-950">{title}</h3>
          <p className="vow-settings-hint mt-2">{description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
            done
              ? "bg-emerald-100 text-emerald-800"
              : skipped
                ? "bg-stone-100 text-stone-600"
                : optional
                  ? "bg-brand-100 text-brand-800"
                  : "bg-amber-100 text-amber-900"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="px-5 py-5 text-base sm:px-6">{children}</div>
    </section>
  );
}
