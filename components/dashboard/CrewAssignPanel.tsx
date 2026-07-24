"use client";

import { useCallback, useEffect, useState } from "react";
import type { TechAssignment, TechMember } from "@/lib/tech-dispatch/types";
import { clientFetch, redirectToLoginIfUnauthorized } from "@/lib/client-fetch";
import { ROUTES } from "@/lib/constants";

const STATUS_LABELS: Record<TechAssignment["status"], string> = {
  offering: "Waiting for crew reply",
  accepted: "Crew assigned",
  declined_all: "All crew passed",
  unassigned: "Could not reach crew",
};

type CrewAssignPanelProps = {
  bookingId: string;
};

export function CrewAssignPanel({ bookingId }: CrewAssignPanelProps) {
  const [assignment, setAssignment] = useState<TechAssignment | null>(null);
  const [crew, setCrew] = useState<TechMember[]>([]);
  const [selectedTechId, setSelectedTechId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, crewRes] = await Promise.all([
        clientFetch(
          `/api/shop/tech-dispatch/assignment?bookingId=${encodeURIComponent(bookingId)}`,
        ),
        clientFetch("/api/shop/tech-dispatch/assign"),
      ]);
      if (redirectToLoginIfUnauthorized(assignRes)) return;
      const assignData = (await assignRes.json()) as { assignment?: TechAssignment | null };
      setAssignment(assignData.assignment ?? null);
      if (crewRes.ok) {
        const crewData = (await crewRes.json()) as { crew?: TechMember[] };
        setCrew(crewData.crew ?? []);
      }
    } catch {
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAssign(mode: "auto" | "manual") {
    setSaving(true);
    setError(null);
    try {
      const res = await clientFetch("/api/shop/tech-dispatch/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          mode,
          techId: mode === "manual" ? selectedTechId : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; assignment?: TechAssignment };
      if (!res.ok) throw new Error(data.error ?? "Assign failed");
      setAssignment(data.assignment ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-stone-600">
        Loading crew assignment…
      </div>
    );
  }

  if (!crew.length && !assignment) {
    return (
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-4 space-y-2">
        <p className="text-sm font-semibold text-brand-900">Crew assignment</p>
        <p className="text-sm text-stone-700">No crew members set up yet.</p>
        <p className="text-xs text-stone-600">
          Add techs in Settings to text accept/pass offers from this booking.
        </p>
        <a
          href={ROUTES.settings}
          className="inline-block text-sm font-semibold text-brand-700 underline"
        >
          Add crew in Settings
        </a>
      </div>
    );
  }

  const pending = assignment?.offers.find((o) => o.outcome === "pending");

  return (
    <div className="rounded-xl border border-brand-200/70 bg-brand-50/30 p-4 space-y-3">
      <p className="text-sm font-semibold text-brand-900">Crew assignment</p>

      {assignment ? (
        <>
          <p className="text-sm text-stone-700">{STATUS_LABELS[assignment.status]}</p>
          {assignment.status === "accepted" && assignment.assignedTechName ? (
            <p className="text-sm text-stone-800">
              Assigned: <span className="font-medium">{assignment.assignedTechName}</span>
            </p>
          ) : null}
          {assignment.status === "offering" && pending ? (
            <p className="text-sm text-stone-800">
              Offer sent to <span className="font-medium">{pending.techName}</span>
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-stone-600">No crew assigned yet.</p>
      )}

      {crew.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <label className="block min-w-[10rem] flex-1">
            <span className="text-xs font-medium text-stone-600">Assign to</span>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select crew…</option>
              {crew.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name.trim() || t.phone}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={saving || !selectedTechId}
            onClick={() => void runAssign("manual")}
            className="rounded-lg bg-brand-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Assign
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void runAssign("auto")}
            className="rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm font-semibold text-brand-900 disabled:opacity-50"
          >
            Auto-offer
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
