"use client";

import { orderStatusLabelKo } from "@/giu/lib/order-status";
import { resolveDisplayOrderStatus, type GiuPickupPolicy } from "@/giu/lib/pickup-policy";
import type { GiuOrderStatus, GiuReservation } from "@/giu/lib/types";

type Props = {
  reservation: GiuReservation;
  boxPickupEnd?: string;
  policy?: GiuPickupPolicy;
  size?: "sm" | "md";
};

function badgeTone(status: GiuOrderStatus): string {
  if (status === "not_picked_up" || status === "no_show_review") {
    return "bg-amber-100 text-amber-900";
  }
  if (
    status === "pickup_waiting" ||
    status === "payment_completed" ||
    status === "merchant_confirmed" ||
    status === "pickup_preparing" ||
    status === "pickup_change_completed"
  ) {
    return "bg-giu-primary-soft text-giu-primary";
  }
  if (status === "pickup_completed" || status === "settlement_completed") {
    return "bg-giu-accent-soft text-giu-primary";
  }
  if (
    status === "refund_requested" ||
    status === "refund_processing" ||
    status === "refund_completed"
  ) {
    return "bg-giu-bg text-giu-muted";
  }
  if (status === "dispute_processing" || status === "pickup_change_requested") {
    return "bg-orange-50 text-orange-900";
  }
  if (status === "cancel_requested" || status === "order_cancelled") {
    return "bg-giu-bg text-giu-muted";
  }
  return "bg-giu-bg text-giu-muted";
}

export function OrderStatusBadge({ reservation, boxPickupEnd, policy, size = "sm" }: Props) {
  const displayStatus = resolveDisplayOrderStatus(reservation, boxPickupEnd, policy);
  const label = orderStatusLabelKo(displayStatus);
  const sizeClass = size === "md" ? "px-3 py-1.5 text-[12px]" : "px-2.5 py-1 text-[11px]";

  return (
    <span className={`rounded-full font-bold ${sizeClass} ${badgeTone(displayStatus)}`}>
      {label}
    </span>
  );
}
