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
  /** Hide long description / tip on small screens to reduce scroll in nested wizards */
  streamlineMobile?: boolean;
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
  streamlineMobile = false,
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
      className={`vow-golive-step scroll-mt-28 rounded-2xl border bg-white shadow-sm ${
        done ? "border-emerald-200" : "border-brand-200/70"
      }`}
    >
      <div
        className={`border-b px-3 py-3 sm:px-6 sm:py-4 ${
          done ? "border-emerald-100 bg-emerald-50/50" : "border-brand-100 bg-brand-50/30"
        }`}
      >
        <div className="flex gap-2.5 sm:gap-4">
          {icon ? (
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl ${
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
            <h3 className="mt-0.5 text-base font-bold text-brand-950 sm:mt-1 sm:text-xl">{title}</h3>
            {!showSummaryOnly ? (
              <p
                className={`mt-1 text-base leading-snug text-stone-600 sm:mt-2 sm:leading-relaxed ${
                  streamlineMobile ? "hidden sm:block" : ""
                }`}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {quickTip && !showSummaryOnly ? (
          <p
            className={`mt-2 rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-2.5 text-base leading-snug text-sky-950 sm:mt-3 sm:py-3 sm:leading-relaxed ${
              streamlineMobile ? "hidden sm:block" : ""
            }`}
          >
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

      <div className="px-3 py-4 text-base sm:px-6 sm:py-5">
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
