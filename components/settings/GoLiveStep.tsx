"use client";

import { useEffect, useState, type ReactNode } from "react";

type GoLiveStepProps = {
  id: string;
  step: string;
  title: string;
  description: string;
  quickTip?: string;
  icon?: string;
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
  id,
  step,
  title,
  description,
  quickTip,
  icon,
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
      id={id}
      className={`vow-golive-step scroll-mt-28 overflow-hidden rounded-2xl border bg-white shadow-sm ${
        done ? "border-emerald-200" : "border-brand-200/70"
      }`}
    >
      <div
        className={`border-b px-4 py-4 sm:px-6 ${
          done ? "border-emerald-100 bg-emerald-50/50" : "border-brand-100 bg-brand-50/30"
        }`}
      >
        <div className="flex gap-3 sm:gap-4">
          {icon ? (
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm sm:h-14 sm:w-14 sm:text-2xl ${
                done
                  ? "bg-emerald-100 ring-1 ring-emerald-200"
                  : "bg-white ring-1 ring-brand-200/80"
              }`}
              aria-hidden
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-700 sm:text-sm">
                {step}
              </p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold sm:text-sm ${
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
            <h3 className="mt-1 text-lg font-bold text-brand-950 sm:text-xl">{title}</h3>
            {!showSummaryOnly ? (
              <p className="mt-2 text-base leading-relaxed text-stone-600">{description}</p>
            ) : null}
          </div>
        </div>

        {quickTip && !showSummaryOnly ? (
          <p className="mt-3 rounded-xl border border-sky-100 bg-sky-50/90 px-3.5 py-3 text-sm leading-relaxed text-sky-950 sm:text-base">
            {quickTip}
          </p>
        ) : null}

        {done ? (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="mt-4 min-h-[44px] w-full rounded-xl border border-brand-300 bg-white px-4 py-2.5 text-base font-semibold text-brand-900 shadow-sm active:bg-brand-50 sm:w-auto sm:min-w-[7rem]"
          >
            {editing ? collapseLabel : editLabel}
          </button>
        ) : null}
      </div>

      <div className="px-4 py-5 text-base sm:px-6">
        {showSummaryOnly ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-4 text-base leading-relaxed text-emerald-900">
            {doneSummary}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
