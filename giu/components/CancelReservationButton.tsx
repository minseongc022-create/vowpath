"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelReservationButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    setLoading(true);
    await fetch(`/api/giu/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "huy" }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={cancel}
      disabled={loading}
      className="text-sm text-giu-muted underline hover:text-giu-ink"
    >
      {loading ? "Đang hủy..." : "Hủy giữ chỗ — nhường suất cho người khác"}
    </button>
  );
}
