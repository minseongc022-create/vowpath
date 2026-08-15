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
  { id: "vietqr", label: "VietQR", sub: "빠른 계좌이체" },
  { id: "momo", label: "MoMo", sub: "MoMo 지갑" },
  { id: "card", label: "카드", sub: "국제 카드" },
];

export function ReserveForm({
  boxId,
  salePriceVnd,
  checkoutBackend = "demo",
}: {
  boxId: string;
  salePriceVnd: number;
  checkoutBackend?: GiuPaymentBackend;
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
    return (
      <div className="giu-card text-center text-sm text-giu-muted">불러오는 중...</div>
    );
  }

  if (!account) {
    return (
      <div className="giu-card space-y-4">
        <p className="text-2xl font-bold text-giu-ink">{formatVnd(salePriceVnd)}</p>
        <p className="text-sm text-giu-muted">{GIU_STRINGS.payCta}</p>
        <Link
          href={`${GIU_ROUTES.auth}?role=customer&next=${encodeURIComponent(`/giu/hop/${boxId}`)}`}
          className="giu-btn-primary block text-center"
        >
          로그인 / 회원가입
        </Link>
      </div>
    );
  }

  if (successCode && reservationId) {
    return (
      <div className="giu-card space-y-4 text-center">
        <span className="giu-badge-safe">결제 완료</span>
        <p className="font-mono text-4xl font-extrabold tracking-[0.2em] text-giu-ink">{successCode}</p>
        <p className="text-sm text-giu-muted">
          {smsSent ? "구출 코드 · SMS 발송됨" : "구출 코드 · 앱에서 확인하세요"}
        </p>
        <Link href={`/giu/dat/${reservationId}`} className="giu-btn-primary block text-center">
          상세 보기
        </Link>
      </div>
    );
  }

  const payLabel = loading
    ? "이동 중..."
    : useLsCheckout
      ? "카드 · PayPal로 결제"
      : GIU_STRINGS.payCta;

  return (
    <form onSubmit={submit} className="giu-card space-y-5">
      <div>
        <p className="text-sm text-giu-muted">결제</p>
        <p className="mt-1 text-3xl font-bold text-giu-ink">{formatVnd(salePriceVnd)}</p>
        {useLsCheckout ? (
          <p className="mt-1 text-xs text-giu-muted">
            Lemon Squeezy · Visa · Mastercard · PayPal
          </p>
        ) : null}
      </div>

      <div className="giu-info-banner">
        <p className="font-semibold text-giu-primary">{GIU_STRINGS.escrowTitle}</p>
        <p className="mt-1 text-giu-muted">{GIU_STRINGS.escrowDesc}</p>
      </div>

      <div>
        <p className="giu-label">수량</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-giu-bg text-lg ring-1 ring-giu-border"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="w-8 text-center font-semibold">{quantity}</span>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-giu-bg text-lg ring-1 ring-giu-border"
            onClick={() => setQuantity((q) => Math.min(5, q + 1))}
          >
            +
          </button>
          <span className="text-sm text-giu-muted">{formatVnd(salePriceVnd * quantity)}</span>
        </div>
      </div>

      {useVnpayCheckout ? (
        <div>
          <p className="giu-label">결제 수단</p>
          <div className="space-y-2">
            {VNPAY_OPTIONS.map((opt) => {
              const selected = paymentMethod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition ${
                    selected
                      ? "bg-giu-primary-soft ring-2 ring-giu-primary"
                      : "bg-giu-bg ring-1 ring-giu-border"
                  }`}
                >
                  <span>
                    <span className="block font-semibold text-giu-ink">{opt.label}</span>
                    <span className="block text-xs text-giu-muted">{opt.sub}</span>
                  </span>
                  {selected ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-giu-primary text-xs text-white">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}

      <button type="submit" disabled={loading} className="giu-btn-primary">
        {payLabel}
      </button>
    </form>
  );
}
