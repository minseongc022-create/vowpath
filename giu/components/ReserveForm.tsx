"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/giu/lib/format";
import { t } from "@/giu/lib/i18n";
import type { GiuPaymentBackend } from "@/giu/lib/payments";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuPaymentMethod } from "@/giu/lib/types";
import { TossPaymentCheckout } from "./TossPaymentCheckout";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";

const VNPAY_OPTIONS: { id: GiuPaymentMethod; label: string; sub: string }[] = [
  { id: "vietqr", label: "계좌이체", sub: "QR · 송금" },
  { id: "momo", label: "간편결제", sub: "지갑" },
  { id: "card", label: "카드", sub: "신용·체크" },
];

export function ReserveForm({
  boxId,
  boxTitle,
  salePriceVnd,
  maxQuantity = 5,
  checkoutBackend = "demo",
  tossClientKey,
  compact = false,
}: {
  boxId: string;
  boxTitle?: string;
  salePriceVnd: number;
  maxQuantity?: number;
  checkoutBackend?: GiuPaymentBackend;
  tossClientKey?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const { account, loading: authLoading } = useGiuAuth();
  const [paymentMethod, setPaymentMethod] = useState<GiuPaymentMethod>("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [tossCheckout, setTossCheckout] = useState<{
    reservationId: string;
    orderName: string;
    amount: number;
  } | null>(null);

  const useLsCheckout = checkoutBackend === "lemon_squeezy";
  const useVnpayCheckout = checkoutBackend === "vnpay";
  const useTossCheckout = checkoutBackend === "toss";
  const cap = Math.max(1, Math.min(maxQuantity, 50));
  const totalAmount = salePriceVnd * quantity;

  useEffect(() => {
    setQuantity((q) => Math.min(q, cap));
  }, [cap]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function createReservation(): Promise<boolean> {
    if (!account) return false;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/giu/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          boxId,
          quantity,
          paymentMethod: useVnpayCheckout ? paymentMethod : "card",
        }),
      });
      const data = (await res.json()) as {
        id?: string;
        code?: string;
        paymentUrl?: string;
        mode?: string;
        error?: string;
        reservation?: { id?: string; smsSent?: boolean };
      };
      if (!res.ok) {
        setError(data.error ?? t(locale, "waitlistError"));
        return false;
      }

      if ((data.mode === "vnpay" || data.mode === "lemon_squeezy") && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return false;
      }

      if (data.mode === "toss" && data.id) {
        setTossCheckout({
          reservationId: data.id,
          orderName: boxTitle ?? "Giu 마감할인",
          amount: totalAmount,
        });
        return true;
      }

      if (data.code && data.id) {
        setSuccessCode(data.code);
        setReservationId(data.id);
        setSmsSent(Boolean(data.reservation?.smsSent));
        router.refresh();
        return true;
      }

      setError(t(locale, "waitlistError"));
      return false;
    } catch {
      setError(t(locale, "waitlistError"));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!account || useTossCheckout) return;
    await createReservation();
  }

  async function startTossCheckout() {
    if (!account || tossCheckout) return;
    await createReservation();
  }

  if (authLoading) {
    return <p className="text-center text-[13px] text-giu-muted">{t(locale, "loading")}</p>;
  }

  if (!account) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-giu-muted">{t(locale, "escrowTitle")}</p>
            <p className="text-xl font-extrabold tracking-tight">{formatVnd(salePriceVnd)}</p>
          </div>
        </div>
        <Link
          href={`${href(GIU_ROUTES.auth)}?role=customer&next=${encodeURIComponent(href(GIU_ROUTES.customer.box(boxId)))}`}
          className="giu-btn-primary block text-center"
        >
          {t(locale, "loginAndRescue")}
        </Link>
      </div>
    );
  }

  if (successCode && reservationId) {
    return (
      <div className="space-y-3 text-center">
        <p className="giu-ticket-code !text-[32px]">{successCode}</p>
        <p className="text-[12px] text-giu-muted">
          {smsSent ? t(locale, "payDoneSms") : t(locale, "payDoneApp")}
        </p>
        <Link href={href(GIU_ROUTES.customer.reservation(reservationId))} className="giu-btn-primary block text-center">
          {t(locale, "openTicket")}
        </Link>
      </div>
    );
  }

  const payLabel = loading
    ? t(locale, "paying")
    : useLsCheckout
      ? t(locale, "payCardPaypal")
      : useTossCheckout
        ? t(locale, "payKrwCta")
        : t(locale, "payCta");

  return (
    <div className={compact ? "space-y-3" : "giu-card space-y-4"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-giu-muted">{t(locale, "total")}</p>
          <p className="text-xl font-extrabold tracking-tight">{formatVnd(totalAmount)}</p>
        </div>
        {!tossCheckout ? (
          <div className="text-right">
            <p className="text-[10px] font-semibold text-giu-muted">{t(locale, "qtyPickHint")}</p>
            <p className="text-[11px] font-medium text-giu-primary">
              {cap}
              {t(locale, "qtyLeftHint")}
            </p>
            <div className="mt-1 flex items-center justify-end gap-2" aria-label={t(locale, "qty")}>
              <button
                type="button"
                className="giu-btn-3d giu-tap flex h-9 w-9 items-center justify-center rounded-xl bg-giu-bg text-lg ring-1 ring-giu-border"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-bold">{quantity}</span>
              <button
                type="button"
                className="giu-btn-3d giu-tap flex h-9 w-9 items-center justify-center rounded-xl bg-giu-bg text-lg ring-1 ring-giu-border"
                onClick={() => setQuantity((q) => Math.min(cap, q + 1))}
              >
                +
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-[11px] leading-snug text-giu-muted">{t(locale, "escrowDesc")}</p>

      {useTossCheckout && tossCheckout && tossClientKey ? (
        <TossPaymentCheckout
          locale={locale}
          clientKey={tossClientKey}
          customerKey={account.id}
          customerName={account.name}
          customerEmail={account.email}
          reservationId={tossCheckout.reservationId}
          orderName={tossCheckout.orderName}
          amount={tossCheckout.amount}
          origin={origin}
          onError={setError}
        />
      ) : null}

      {useVnpayCheckout && !tossCheckout ? (
        <div className="grid grid-cols-3 gap-1.5">
          {VNPAY_OPTIONS.map((opt) => {
            const selected = paymentMethod === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPaymentMethod(opt.id)}
                className={`rounded-[12px] px-2 py-2 text-center transition ${
                  selected
                    ? "bg-giu-primary-soft ring-2 ring-giu-primary"
                    : "bg-giu-bg ring-1 ring-giu-border"
                }`}
              >
                <span className="block text-[12px] font-bold text-giu-ink">{opt.label}</span>
                <span className="block text-[10px] text-giu-muted">{opt.sub}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}

      {!tossCheckout ? (
        useTossCheckout ? (
          <button
            type="button"
            disabled={loading || !tossClientKey}
            onClick={() => void startTossCheckout()}
            className="giu-btn-primary w-full"
          >
            {!tossClientKey ? "결제 설정 필요" : payLabel}
          </button>
        ) : (
          <form onSubmit={submit}>
            <button type="submit" disabled={loading} className="giu-btn-primary w-full">
              {payLabel}
            </button>
          </form>
        )
      ) : null}
    </div>
  );
}
