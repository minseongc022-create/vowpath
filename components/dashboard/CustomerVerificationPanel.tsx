"use client";

import {
  formatVerificationDateTime,
  toCustomerVerificationView,
} from "@/lib/customer-verification/labels";
import type { CustomerVerificationRecord } from "@/lib/customer-verification/types";

const BADGE_CLASS: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  orange: "bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/30",
  amber: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  slate: "bg-white/10 text-slate-400 ring-1 ring-white/10",
};

type CustomerVerificationPanelProps = {
  record: CustomerVerificationRecord | null | undefined;
  title?: string;
  dark?: boolean;
};

export function CustomerVerificationPanel({
  record,
  title = "Customer Verification",
  dark = true,
}: CustomerVerificationPanelProps) {
  const view = toCustomerVerificationView(record);
  if (!view) {
    return (
      <section
        className={
          dark
            ? "rounded-2xl border border-white/[0.06] bg-[#161b22] p-6"
            : "rounded-2xl border border-slate-200 bg-white p-6"
        }
      >
        <h3
          className={`text-sm font-semibold uppercase tracking-wider ${
            dark ? "text-slate-300" : "text-slate-700"
          }`}
        >
          {title}
        </h3>
        <p className={`mt-3 text-sm ${dark ? "text-slate-500" : "text-slate-500"}`}>
          No customer verification text was sent (link intake).
        </p>
      </section>
    );
  }

  const badgeClass = BADGE_CLASS[view.badgeTone] ?? BADGE_CLASS.slate;

  return (
    <section
      className={
        dark
          ? "rounded-2xl border border-white/[0.06] bg-[#161b22] p-6"
          : "rounded-2xl border border-slate-200 bg-white p-6"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3
          className={`text-sm font-semibold uppercase tracking-wider ${
            dark ? "text-slate-300" : "text-slate-700"
          }`}
        >
          {title}
        </h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
          {view.badgeLabel}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className={dark ? "text-slate-500" : "text-slate-500"}>Status</dt>
          <dd className={`font-medium ${dark ? "text-white" : "text-slate-900"}`}>
            {view.statusLabel}
          </dd>
        </div>
        <div>
          <dt className={dark ? "text-slate-500" : "text-slate-500"}>Response</dt>
          <dd className={`font-medium ${dark ? "text-white" : "text-slate-900"}`}>
            {view.responseLabel ?? "—"}
          </dd>
        </div>
        <div>
          <dt className={dark ? "text-slate-500" : "text-slate-500"}>Sent</dt>
          <dd className={dark ? "text-slate-200" : "text-slate-800"}>
            {formatVerificationDateTime(view.sentAt)}
          </dd>
        </div>
        <div>
          <dt className={dark ? "text-slate-500" : "text-slate-500"}>Responded</dt>
          <dd className={dark ? "text-slate-200" : "text-slate-800"}>
            {formatVerificationDateTime(view.respondedAt)}
          </dd>
        </div>
      </dl>

      {view.timeline.length > 0 ? (
        <ul className={`mt-4 space-y-2 border-t pt-4 ${dark ? "border-white/10" : "border-slate-200"}`}>
          {view.timeline.map((entry, i) => (
            <li key={`${entry.at}-${i}`} className="text-xs">
              <span className={dark ? "text-slate-500" : "text-slate-500"}>
                {formatVerificationDateTime(entry.at)}
              </span>
              <span className={`ml-2 ${dark ? "text-slate-300" : "text-slate-700"}`}>
                {entry.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
