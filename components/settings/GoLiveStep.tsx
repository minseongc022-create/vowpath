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
        done ? "border-emerald-200" : "border-slate-200"
      }`}
    >
      <div
        className={`flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 sm:px-6 ${
          done ? "border-emerald-100 bg-emerald-50/60" : "border-slate-100 bg-slate-50/80"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {step}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            done
              ? "bg-emerald-100 text-emerald-800"
              : skipped
                ? "bg-slate-100 text-slate-600"
                : optional
                  ? "bg-brand-50 text-brand-800"
                  : "bg-amber-100 text-amber-900"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}
