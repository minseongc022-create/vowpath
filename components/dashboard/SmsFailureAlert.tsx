"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TenantEvent } from "@/lib/tenant-events";
import { dashboardUi } from "@/lib/content";

const SEEN_KEY = "vowroad:seen-sms-failures";
const ALERT_MAX_AGE_MS = 30 * 60 * 1000;

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-80)));
  } catch {
    /* ignore */
  }
}

type SmsFailureAlertProps = {
  tenantEvents: TenantEvent[];
};

export function SmsFailureAlert({ tenantEvents }: SmsFailureAlertProps) {
  const seenRef = useRef<Set<string>>(loadSeen());
  const [active, setActive] = useState<TenantEvent | null>(null);

  const latestFailure = useMemo(() => {
    const cutoff = Date.now() - ALERT_MAX_AGE_MS;
    return tenantEvents.find(
      (e) =>
        e.type === "sms_delivery_failed" &&
        new Date(e.createdAt).getTime() >= cutoff,
    );
  }, [tenantEvents]);

  useEffect(() => {
    if (!latestFailure) return;
    if (seenRef.current.has(latestFailure.id)) return;

    seenRef.current.add(latestFailure.id);
    saveSeen(seenRef.current);
    setActive(latestFailure);

    const t = window.setTimeout(() => setActive(null), 20_000);
    return () => window.clearTimeout(t);
  }, [latestFailure]);

  if (!active) return null;

  const copy = dashboardUi.smsFailureAlert;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-[100] w-[min(92vw,28rem)] -translate-x-1/2 rounded-lg border border-red-500/40 bg-[#1a1214] px-4 py-3 shadow-xl"
    >
      <p className="text-sm font-semibold text-red-200">{copy.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">{active.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={active.href ?? "/settings?section=contact"}
          className="rounded-md bg-red-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
        >
          {copy.fixSettings}
        </Link>
        <button
          type="button"
          onClick={() => setActive(null)}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          {copy.dismiss}
        </button>
      </div>
    </div>
  );
}
