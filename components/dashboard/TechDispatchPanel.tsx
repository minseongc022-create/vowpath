"use client";

import { useCallback, useEffect, useState } from "react";
import type { TechAssignment } from "@/lib/tech-dispatch/types";
import { clientFetch, redirectToLoginIfUnauthorized } from "@/lib/client-fetch";

const STATUS_LABELS: Record<TechAssignment["status"], string> = {
  offering: "Waiting for crew reply",
  accepted: "Crew assigned",
  declined_all: "All crew passed",
  unassigned: "Could not reach crew",
};

type TechDispatchPanelProps = {
  bookingId: string;
};

export function TechDispatchPanel({ bookingId }: TechDispatchPanelProps) {
  const [assignment, setAssignment] = useState<TechAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientFetch(
        `/api/shop/tech-dispatch/assignment?bookingId=${encodeURIComponent(bookingId)}`,
      );
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = (await res.json()) as { assignment?: TechAssignment | null };
      setAssignment(data.assignment ?? null);
    } catch {
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-stone-600">
        Loading crew assignment…
      </div>
    );
  }

  if (!assignment) {
    return null;
  }

  const pending = assignment.offers.find((o) => o.outcome === "pending");

  return (
    <div className="rounded-xl border border-brand-200/70 bg-brand-50/30 p-4">
      <p className="text-sm font-semibold text-brand-900">Crew assignment</p>
      <p className="mt-1 text-sm text-stone-700">{STATUS_LABELS[assignment.status]}</p>
      {assignment.status === "accepted" && assignment.assignedTechName ? (
        <p className="mt-2 text-sm text-stone-800">
          Assigned: <span className="font-medium">{assignment.assignedTechName}</span>
        </p>
      ) : null}
      {assignment.status === "offering" && pending ? (
        <p className="mt-2 text-sm text-stone-800">
          Offer sent to <span className="font-medium">{pending.techName}</span> — reply 1 accept / 2 pass
        </p>
      ) : null}
      {assignment.status === "declined_all" ? (
        <p className="mt-2 text-sm text-amber-800">Assign manually or add more crew in Settings.</p>
      ) : null}
    </div>
  );
}
