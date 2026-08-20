"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";

type Props = {
  clientKey: string;
  sellerId: string;
  sellerEmail: string;
  orderId: string;
  amount: number;
  origin: string;
};

/** Mirrors giu/components/TossPaymentCheckout.tsx — same SDK, same widget flow. */
export function TossCheckout({ clientKey, sellerId, sellerEmail, orderId, amount, origin }: Props) {
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey: sellerId });
        if (cancelled) return;

        await widgets.setAmount({ currency: "KRW", value: amount });
        await widgets.renderPaymentMethods({ selector: "#pricepulse-toss-method", variantKey: "DEFAULT" });
        await widgets.renderAgreement({ selector: "#pricepulse-toss-agreement", variantKey: "AGREEMENT" });

        widgetsRef.current = widgets;
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error("[pricepulse/toss] widget init failed", e);
        setError("결제 위젯을 불러올 수 없습니다");
      }
    }

    void init();
    return () => {
      cancelled = true;
      widgetsRef.current = null;
    };
  }, [amount, clientKey, sellerId]);

  async function pay() {
    const widgets = widgetsRef.current;
    if (!widgets || paying) return;
    setPaying(true);
    try {
      await widgets.requestPayment({
        orderId,
        orderName: "Pricepulse Pro (30일)",
        customerName: sellerEmail,
        customerEmail: sellerEmail,
        successUrl: `${origin}/pricepulse/upgrade/confirm`,
        failUrl: `${origin}/pricepulse/upgrade/fail?orderId=${encodeURIComponent(orderId)}`,
      });
    } catch (e) {
      console.error("[pricepulse/toss] requestPayment failed", e);
      setError("결제를 시작할 수 없습니다");
      setPaying(false);
    }
  }

  return (
    <div className="space-y-3">
      <div id="pricepulse-toss-method" className="min-h-[120px] rounded-lg bg-white" />
      <div id="pricepulse-toss-agreement" className="rounded-lg bg-white" />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={!ready || paying}
        onClick={() => void pay()}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {paying ? "결제 처리 중..." : "결제하고 Pro 시작하기"}
      </button>
    </div>
  );
}
