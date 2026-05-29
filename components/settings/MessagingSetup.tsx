"use client";

import { useEffect, useState } from "react";
import { messagingSetup as copy } from "@/lib/content";

type MessagingStatus = {
  emailConfigured: boolean;
  emailFrom: string | null;
  smsConfigured: boolean;
  twilioPhone: string | null;
  resendNote: string | null;
  twilioNote: string | null;
};

export function MessagingSetup() {
  const [status, setStatus] = useState<MessagingStatus | null>(null);

  useEffect(() => {
    fetch("/api/messaging/status")
      .then((r) => r.json())
      .then((d: MessagingStatus) => setStatus(d))
      .catch(() =>
        setStatus({
          emailConfigured: false,
          emailFrom: null,
          smsConfigured: false,
          twilioPhone: null,
          resendNote: null,
          twilioNote: null,
        }),
      );
  }, []);

  if (!status) return null;

  const ready = status.emailConfigured || status.smsConfigured;

  return (
    <section className="hvac-card p-5">
      <p className="text-sm font-medium text-brand-600">{copy.eyebrow}</p>
      <h2 className="mt-1 text-lg font-semibold text-brand-950">{copy.title}</h2>
      <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">{copy.emailLabel}</dt>
          <dd className="font-medium text-brand-950">
            {status.emailConfigured ? copy.yes : copy.no}
          </dd>
        </div>
        {status.emailFrom ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="text-slate-500">{copy.emailFromLabel}</dt>
            <dd className="break-all text-right font-mono text-xs text-brand-900">
              {status.emailFrom}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">{copy.smsLabel}</dt>
          <dd className="font-medium text-brand-950">
            {status.smsConfigured ? copy.yes : copy.no}
          </dd>
        </div>
        {status.twilioPhone ? (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{copy.smsFromLabel}</dt>
            <dd className="font-mono text-brand-950">{status.twilioPhone}</dd>
          </div>
        ) : null}
      </dl>

      {status.resendNote ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {status.resendNote}
        </p>
      ) : null}
      {status.twilioNote && !status.smsConfigured ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {status.twilioNote}
        </p>
      ) : null}

      {!ready ? (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {copy.readyMessage}
        </p>
      )}
    </section>
  );
}
