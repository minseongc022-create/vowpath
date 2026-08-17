"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  clientKey: string;
  customerKey: string;
  customerName: string;
  customerEmail: string;
  reservationId: string;
  orderName: string;
  amount: number;
  origin: string;
  onError?: (message: string) => void;
};

export function TossPaymentCheckout({
  locale,
  clientKey,
  customerKey,
  customerName,
  customerEmail,
  reservationId,
  orderName,
  amount,
  origin,
  onError,
}: Props) {
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function init() {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey });
        if (cancelled || !mountedRef.current) return;

        await widgets.setAmount({ currency: "KRW", value: amount });
        await widgets.renderPaymentMethods({
          selector: "#giu-toss-payment-method",
          variantKey: "DEFAULT",
        });
        await widgets.renderAgreement({
          selector: "#giu-toss-agreement",
          variantKey: "AGREEMENT",
        });

        widgetsRef.current = widgets;
        if (!cancelled && mountedRef.current) setReady(true);
      } catch (e) {
        console.error("[giu/toss] widget init failed", e);
        onError?.("결제 위젯을 불러올 수 없습니다");
      }
    }

    void init();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      widgetsRef.current = null;
    };
  }, [amount, clientKey, customerKey, onError]);

  async function pay() {
    const widgets = widgetsRef.current;
    if (!widgets || paying) return;
    setPaying(true);
    try {
      await widgets.requestPayment({
        orderId: reservationId,
        orderName: orderName.slice(0, 100),
        customerName: customerName.slice(0, 100),
        customerEmail,
        successUrl: `${origin}/api/giu/payments/toss/confirm`,
        failUrl: `${origin}/api/giu/payments/toss/fail?orderId=${encodeURIComponent(reservationId)}`,
      });
    } catch (e) {
      console.error("[giu/toss] requestPayment failed", e);
      onError?.("결제를 시작할 수 없습니다");
      setPaying(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-giu-muted">
        카드 · 카카오페이 · 네이버페이 · 토스페이
      </p>
      <div id="giu-toss-payment-method" className="min-h-[120px] rounded-[14px] bg-white/80 p-1" />
      <div id="giu-toss-agreement" className="rounded-[14px] bg-white/80 p-1" />
      <button
        type="button"
        disabled={!ready || paying}
        onClick={() => void pay()}
        className="giu-btn-primary giu-btn-3d w-full"
      >
        {paying ? t(locale, "paying") : t(locale, "payKrwCta")}
      </button>
    </div>
  );
}
