"use client";

import {
  formatVerificationDateTime,
  toCustomerVerificationView,
} from "@/lib/customer-verification/labels";
import type { CustomerVerificationRecord } from "@/lib/customer-verification/types";

const BADGE_CLASS: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  orange: "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
  amber: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  slate: "bg-stone-100 text-stone-600 ring-1 ring-stone-200",
};

type CustomerVerificationPanelProps = {
  record: CustomerVerificationRecord | null | undefined;
  title?: string;
  dark?: boolean;
};

export function CustomerVerificationPanel({
  record,
  title = "Customer Verification",
  dark = false,
}: CustomerVerificationPanelProps) {
  const view = toCustomerVerificationView(record);
  if (!view) {
    return (
      <section
        className="rounded-2xl border border-brand-200 bg-white p-6"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-800">
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
    <section className="booking-detail-card rounded-2xl border border-brand-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-800">
          {title}
        </h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
          {view.badgeLabel}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-stone-500">Status</dt>
          <dd className="font-medium text-brand-950">
            {view.statusLabel}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">Response</dt>
          <dd className="font-medium text-brand-950">
            {view.responseLabel ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">Sent</dt>
          <dd className="text-stone-700">
            {formatVerificationDateTime(view.sentAt)}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">Responded</dt>
          <dd className="text-stone-700">
            {formatVerificationDateTime(view.respondedAt)}
          </dd>
        </div>
      </dl>

      {view.timeline.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-brand-200/60 pt-4">
          {view.timeline.map((entry, i) => (
            <li key={`${entry.at}-${i}`} className="text-xs">
              <span className="text-stone-500">
                {formatVerificationDateTime(entry.at)}
              </span>
              <span className="ml-2 text-stone-700">
                {entry.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
