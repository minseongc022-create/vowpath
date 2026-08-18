"use client";

import { PickupPinDisplay } from "@/giu/components/PickupPinDisplay";
import { PickupQrCode } from "@/giu/components/PickupQrCode";
import { ReviewForm } from "@/giu/components/ReviewForm";
import { useGiuLocale } from "@/giu/components/GiuLocaleProvider";

type Props = {
  reservationId: string;
  pickupCode: string;
  pickedUp: boolean;
  paid: boolean;
  existingReviewRating?: number;
};

export function ReservationTicketExtras({
  reservationId,
  pickupCode,
  pickedUp,
  paid,
  existingReviewRating,
}: Props) {
  const { locale } = useGiuLocale();

  if (!paid) return null;

  return (
    <div className="space-y-3">
      {!pickedUp ? (
        <>
          <PickupPinDisplay locale={locale} code={pickupCode} />
          <PickupQrCode locale={locale} reservationId={reservationId} />
        </>
      ) : null}
      {pickedUp ? (
        <ReviewForm
          locale={locale}
          reservationId={reservationId}
          existingRating={existingReviewRating}
        />
      ) : null}
    </div>
  );
}
