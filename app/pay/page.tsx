"use client";

import { useEffect, useState } from "react";
import { initializePaddle } from "@paddle/paddle-js";
import { isEnglishUi } from "@/lib/locale";

/**
 * Set as the Paddle "Default payment link" (Paddle > Checkout > Checkout settings).
 * Paddle appends ?_ptxn=<transactionId> to this URL for every checkout.url it returns,
 * so this page's only job is to read that id and open the real Paddle.js overlay for it.
 */
export default function PayPage() {
  const [error, setError] = useState<string | null>(null);
  const en = isEnglishUi();

  useEffect(() => {
    const transactionId = new URLSearchParams(window.location.search).get("_ptxn");
    if (!transactionId) {
      setError(en ? "Missing checkout information." : "결제 정보를 찾을 수 없습니다.");
      return;
    }

    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) {
      setError(
        en
          ? "Checkout isn't configured yet. Please try again later."
          : "결제 시스템 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }

    let cancelled = false;
    initializePaddle({
      token,
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
    }).then((paddle) => {
      if (cancelled || !paddle) return;
      paddle.Checkout.open({
        transactionId,
        settings: {
          successUrl: `${window.location.origin}/dashboard/settings?transaction_id=${transactionId}`,
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [en]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4">
      <p className="text-center text-brand-100">
        {error ?? (en ? "Loading checkout…" : "결제창을 불러오는 중…")}
      </p>
    </div>
  );
}
