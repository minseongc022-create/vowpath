"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";
import type { GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservation: GiuReservation;
  onDone?: () => void;
};

export function CustomerPickupProposalReview({ locale, reservation, onDone }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const proposal = reservation.merchantPickupProposal;

  if (!proposal || proposal.status !== "pending") return null;

  const when = new Date(proposal.plannedPickupAt).toLocaleString("ko-KR");

  async function act(action: "approve" | "reject") {
    if (loading) return;
    if (action === "approve" && !window.confirm(t(locale, "pickupProposalApproveConfirm"))) return;
    hapticSelect();
    setLoading(action);
    try {
      const res = await fetch(`/api/giu/reservations/${reservation.id}/pickup-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: action === "approve" ? "approve_proposal" : "reject_proposal" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? t(locale, "mExtendActionFail"));
        return;
      }
      onDone?.();
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2 rounded-[14px] bg-giu-primary-soft p-3 ring-1 ring-giu-primary/20">
      <p className="text-[13px] font-bold text-giu-ink">{t(locale, "pickupProposalTitle")}</p>
      <p className="text-[12px] text-giu-muted">{t(locale, "pickupProposalWhen")} {when}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={Boolean(loading)}
          onClick={() => void act("approve")}
          className="giu-btn-primary giu-btn-3d flex-1 !py-2.5 text-[13px]"
        >
          {loading === "approve" ? t(locale, "loading") : t(locale, "pickupProposalApprove")}
        </button>
        <button
          type="button"
          disabled={Boolean(loading)}
          onClick={() => void act("reject")}
          className="giu-btn-secondary giu-btn-3d flex-1 !py-2.5 text-[13px]"
        >
          {loading === "reject" ? t(locale, "loading") : t(locale, "pickupProposalReject")}
        </button>
      </div>
    </div>
  );
}
