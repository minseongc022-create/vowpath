"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatVnd } from "@/giu/lib/format";
import { GIU_STRINGS } from "@/giu/lib/strings";
import type { GiuPaymentMethod } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";

const PAYMENT_OPTIONS: { id: GiuPaymentMethod; label: string }[] = [
  { id: "momo", label: "MoMo (VNPay)" },
  { id: "vietqr", label: "VietQR / Chuyển khoản" },
  { id: "card", label: "Thẻ quốc tế" },
];

export function ReserveForm({ boxId, salePriceVnd }: { boxId: string; salePriceVnd: number }) {
  const router = useRouter();
  const { account, loading: authLoading } = useGiuAuth();
  const [paymentMethod, setPaymentMethod] = useState<GiuPaymentMethod>("vietqr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);

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
        body: JSON.stringify({ boxId, paymentMethod }),
      });
      const data = (await res.json()) as {
        id?: string;
        code?: string;
        paymentUrl?: string;
        mode?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Có lỗi xảy ra");
        return;
      }

      if (data.mode === "vnpay" && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      if (data.code && data.id) {
        setSuccessCode(data.code);
        setReservationId(data.id);
        router.refresh();
      }
    } catch {
      setError("Không kết nối được. Thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="rounded-2xl border border-giu-border bg-white p-6 text-center text-sm text-giu-muted">
        Đang tải...
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4 rounded-2xl border border-giu-border bg-white p-6">
        <h3 className="text-lg font-semibold text-giu-ink">{GIU_STRINGS.payCta}</h3>
        <p className="text-sm text-giu-muted">
          Đăng nhập để thanh toán an toàn · {formatVnd(salePriceVnd)} · nhận mã ngay sau khi trả.
        </p>
        <Link
          href={`/giu/dang-nhap?next=/giu/hop/${boxId}`}
          className="block w-full rounded-xl bg-giu-accent py-3 text-center text-sm font-semibold text-white"
        >
          Đăng nhập
        </Link>
        <Link
          href={`/giu/dang-ky?next=/giu/hop/${boxId}`}
          className="block w-full rounded-xl border border-giu-border py-3 text-center text-sm font-semibold text-giu-primary"
        >
          Tạo tài khoản
        </Link>
      </div>
    );
  }

  if (successCode && reservationId) {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-giu-primary bg-white p-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-giu-primary">
          Thanh toán thành công
        </p>
        <p className="font-mono text-4xl font-extrabold tracking-widest text-giu-ink">{successCode}</p>
        <p className="text-sm text-giu-muted">Mã giải cứu — SMS cũng đã gửi tới SĐT của bạn</p>
        <Link
          href={`/giu/dat/${reservationId}`}
          className="inline-block rounded-xl bg-giu-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Xem chi tiết →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-giu-border bg-white p-6">
      <h3 className="text-lg font-semibold text-giu-ink">{GIU_STRINGS.escrowTitle}</h3>
      <p className="text-sm text-giu-muted">
        Xin chào <strong>{account.name}</strong> · <strong>{formatVnd(salePriceVnd)}</strong>
      </p>

      <div className="rounded-xl border border-giu-primary/20 bg-giu-primary/5 px-3 py-2 text-xs text-giu-primary">
        {GIU_STRINGS.escrowDesc}
      </div>

      <div>
        <p className="text-sm font-medium text-giu-ink">Phương thức thanh toán</p>
        <div className="mt-2 grid gap-2">
          {PAYMENT_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                paymentMethod === opt.id
                  ? "border-giu-primary bg-giu-primary/5"
                  : "border-giu-border"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value={opt.id}
                checked={paymentMethod === opt.id}
                onChange={() => setPaymentMethod(opt.id)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-giu-accent py-3 text-sm font-semibold text-white hover:bg-giu-accent-hover disabled:opacity-60"
      >
        {loading
          ? "Đang chuyển thanh toán..."
          : `${GIU_STRINGS.payCta} · ${formatVnd(salePriceVnd)}`}
      </button>
    </form>
  );
}
