"use client";

import { useEffect, useState, type ReactNode } from "react";

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
  editLabel?: string;
  collapseLabel?: string;
  doneSummary?: ReactNode;
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
  editLabel = "Edit",
  collapseLabel = "Done",
  doneSummary,
  children,
}: GoLiveStepProps) {
  const [editing, setEditing] = useState(!done);

  useEffect(() => {
    if (!done) setEditing(true);
  }, [done]);

  const statusLabel = done
    ? doneLabel
    : skipped
      ? skippedLabel
      : optional
        ? optionalLabel
        : pendingLabel;

  const showSummaryOnly = done && !editing && doneSummary;

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
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {done ? (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-lg border border-brand-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-900 shadow-sm hover:bg-brand-50"
            >
              {editing ? collapseLabel : editLabel}
            </button>
          ) : null}
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
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
      </div>
      <div className="px-5 py-5 text-base sm:px-6">
        {showSummaryOnly ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3.5 text-base text-emerald-900">
            {doneSummary}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
