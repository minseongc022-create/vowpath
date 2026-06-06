"use client";

import { useCallback, useEffect, useState } from "react";
import { linkIntakePageCopy as copy } from "@/lib/link-intake-copy";
import { clientFetch, clientFetchTimeoutMessage } from "@/lib/client-fetch";
import type { CorrectionBookingView } from "@/lib/customer-verification/correction-types";
import { CustomerCorrectionPanel } from "@/components/intake/CustomerCorrectionPanel";

type CorrectionIntakePageClientProps = {
  token: string;
};

export function CorrectionIntakePageClient({ token }: CorrectionIntakePageClientProps) {
  const [shopName, setShopName] = useState("");
  const [booking, setBooking] = useState<CorrectionBookingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientFetch(
        `/api/correction/${encodeURIComponent(token)}`,
        undefined,
        10_000,
      );
      const data = (await res.json()) as {
        shopName?: string;
        booking?: CorrectionBookingView;
        error?: string;
      };
      if (!res.ok || !data.booking) {
        setError(copy.correctionExpired);
        return;
      }
      setShopName(data.shopName ?? "");
      setBooking(data.booking);
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage("접수 내역을 불러오지 못했습니다. 다시 시도해 주세요.")
          : copy.correctionExpired;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f6f8fc]">
        <p className="text-sm text-slate-600">{copy.loadingSubmission}</p>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#f6f8fc] px-6">
        <p className="text-center text-sm text-rose-800">
          {error ?? copy.correctionExpired}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          다시 시도
        </button>
      </main>
    );
  }

  return <CustomerCorrectionPanel token={token} shopName={shopName} initialBooking={booking} />;
}
