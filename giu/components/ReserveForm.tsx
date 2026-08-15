"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/giu/lib/format";
import type { GiuPaymentBackend } from "@/giu/lib/payments";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { GIU_STRINGS } from "@/giu/lib/strings";
import type { GiuPaymentMethod } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";

const VNPAY_OPTIONS: { id: GiuPaymentMethod; label: string; sub: string }[] = [
  { id: "vietqr", label: "VietQR", sub: "계좌이체" },
  { id: "momo", label: "MoMo", sub: "지갑" },
  { id: "card", label: "카드", sub: "국제 카드" },
];

export function ReserveForm({
  boxId,
  salePriceVnd,
  checkoutBackend = "demo",
  compact = false,
}: {
  boxId: string;
  salePriceVnd: number;
  checkoutBackend?: GiuPaymentBackend;
  compact?: boolean;
}) {
  const router = useRouter();
  const { account, loading: authLoading } = useGiuAuth();
  const [paymentMethod, setPaymentMethod] = useState<GiuPaymentMethod>("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const useLsCheckout = checkoutBackend === "lemon_squeezy";
  const useVnpayCheckout = checkoutBackend === "vnpay";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
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
        reservation?: { smsSent?: boolean };
      };
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다");
        return;
      }

      if (
        (data.mode === "vnpay" || data.mode === "lemon_squeezy") &&
        data.paymentUrl
      ) {
        window.location.href = data.paymentUrl;
        return;
      }

      if (data.code && data.id) {
        setSuccessCode(data.code);
        setReservationId(data.id);
        setSmsSent(Boolean(data.reservation?.smsSent));
        router.refresh();
      }
    } catch {
      setError("연결할 수 없습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return <p className="text-center text-[13px] text-giu-muted">불러오는 중...</p>;
  }

  if (!account) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-giu-muted">Giu 안전 결제</p>
            <p className="text-xl font-extrabold tracking-tight">{formatVnd(salePriceVnd)}</p>
          </div>
        </div>
        <Link
          href={`${GIU_ROUTES.auth}?role=customer&next=${encodeURIComponent(`/giu/hop/${boxId}`)}`}
          className="giu-btn-primary block text-center"
        >
          로그인하고 구출
        </Link>
      </div>
    );
  }

  if (successCode && reservationId) {
    return (
      <div className="space-y-3 text-center">
        <p className="giu-ticket-code !text-[32px]">{successCode}</p>
        <p className="text-[12px] text-giu-muted">
          {smsSent ? "결제 완료 · SMS 발송" : "결제 완료 · 앱에서 코드 확인"}
        </p>
        <Link href={`/giu/dat/${reservationId}`} className="giu-btn-primary block text-center">
          픽업 티켓 열기
        </Link>
      </div>
    );
  }

  const payLabel = loading
    ? "이동 중..."
    : useLsCheckout
      ? "카드 · PayPal 결제"
      : GIU_STRINGS.payCta;

  return (
    <form onSubmit={submit} className={compact ? "space-y-3" : "giu-card space-y-4"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-giu-muted">합계</p>
          <p className="text-xl font-extrabold tracking-tight">
            {formatVnd(salePriceVnd * quantity)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-giu-bg text-lg ring-1 ring-giu-border"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="w-5 text-center text-sm font-bold">{quantity}</span>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-giu-bg text-lg ring-1 ring-giu-border"
            onClick={() => setQuantity((q) => Math.min(5, q + 1))}
          >
            +
          </button>
        </div>
      </div>

      {!compact ? (
        <div className="giu-info-banner">
          <p className="font-semibold text-giu-primary">{GIU_STRINGS.escrowTitle}</p>
          <p className="mt-1 text-giu-muted">{GIU_STRINGS.escrowDesc}</p>
        </div>
      ) : (
        <p className="text-[11px] leading-snug text-giu-muted">
          Giu가 금액 보관 → 픽업 확인 후 가게 정산
        </p>
      )}

      {useVnpayCheckout ? (
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

      <button type="submit" disabled={loading} className="giu-btn-primary">
        {payLabel}
      </button>
    </form>
  );
}
