"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatAuditEventType } from "@/lib/audit-labels";
import { settingsPage } from "@/lib/content";
import type { TenantEvent } from "@/lib/tenant-events";

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AuditActivityPanel() {
  const [events, setEvents] = useState<TenantEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit?days=30", { credentials: "same-origin" });
      if (!res.ok) {
        if (res.status === 401) {
          setError("Sign in to view activity history.");
          setEvents([]);
          return;
        }
        if (res.status === 503) {
          setError("Vercel KV is required in production.");
          setEvents([]);
          return;
        }
        setError("Could not load activity history.");
        setEvents([]);
        return;
      }
      const data = (await res.json()) as { events?: TenantEvent[] };
      setEvents(data.events ?? []);
    } catch {
      setError("Network error while loading activity history.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onUpdate = () => void load();
    window.addEventListener("vowpath:tenant-events-updated", onUpdate);
    window.addEventListener("vowpath:bookings-status-updated", onUpdate);
    return () => {
      window.removeEventListener("vowpath:tenant-events-updated", onUpdate);
      window.removeEventListener("vowpath:bookings-status-updated", onUpdate);
    };
  }, [load]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {settingsPage.auditTitle}
          </p>
          <p className="mt-1 text-sm text-slate-600">{settingsPage.auditDescription}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "…" : settingsPage.auditRefresh}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {loading && events.length === 0 ? (
        <ul className="mt-4 space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </ul>
      ) : null}

      {!loading && !error && events.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
          {settingsPage.auditEmpty}
        </p>
      ) : null}

      {events.length > 0 ? (
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  <span className="text-brand-700">{formatAuditEventType(event.type)}</span>
                  {" · "}
                  {event.title}
                </p>
                <p className="mt-0.5 truncate text-sm text-slate-600">{event.body}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                <time dateTime={event.createdAt}>{formatWhen(event.createdAt)}</time>
                {event.href ? (
                  <Link
                    href={event.href}
                    className="font-semibold text-brand-600 hover:underline"
                  >
                    {settingsPage.auditViewBooking}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
