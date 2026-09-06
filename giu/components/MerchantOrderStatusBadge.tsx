"use client";

import { OrderStatusBadge } from "@/giu/components/OrderStatusBadge";
import type { GiuPickupPolicy } from "@/giu/lib/pickup-policy";
import type { GiuReservation } from "@/giu/lib/types";

type Props = {
  reservation: GiuReservation;
  boxPickupEnd?: string;
  policy?: GiuPickupPolicy;
};

export function MerchantOrderStatusBadge({ reservation, boxPickupEnd, policy }: Props) {
  return (
    <OrderStatusBadge reservation={reservation} boxPickupEnd={boxPickupEnd} policy={policy} />
  );
}
