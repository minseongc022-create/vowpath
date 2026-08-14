"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import type { GiuBox, GiuMerchant, GiuReservation } from "@/giu/lib/types";

export function MerchantPanelClient() {
  const [merchant, setMerchant] = useState<GiuMerchant | null>(null);
  const [boxes, setBoxes] = useState<GiuBox[]>([]);
  const [reservations, setReservations] = useState<GiuReservation[]>([]);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (merchantPhone: string) => {
    setLoading(true);
    setError("");
    try {
      const mRes = await fetch(`/api/giu/merchants?phone=${encodeURIComponent(merchantPhone)}`);
      const mData = (await mRes.json()) as { merchant?: GiuMerchant; error?: string };
      if (!mData.merchant) {
        setError("Không tìm thấy quán với SĐT này.");
        setMerchant(null);
        return;
      }
      setMerchant(mData.merchant);
      const [bRes, rRes] = await Promise.all([
        fetch(`/api/giu/boxes?merchantId=${mData.merchant.id}`),
        fetch(`/api/giu/reservations?merchantId=${mData.merchant.id}`),
      ]);
      const bData = (await bRes.json()) as { boxes: GiuBox[] };
      const rData = (await rRes.json()) as { reservations: GiuReservation[] };
      setBoxes(bData.boxes ?? []);
      setReservations(rData.reservations ?? []);
    } catch {
      setError("Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("giu_merchant_phone");
    if (saved) {
      setPhone(saved);
      void load(saved);
    } else {
      setLoading(false);
    }
  }, [load]);

  async function createBox(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!merchant) return;
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/giu/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantId: merchant.id,
        title: fd.get("title"),
        description: fd.get("description") || undefined,
        originalPriceVnd: Number(fd.get("originalPriceVnd")),
        salePriceVnd: Number(fd.get("salePriceVnd")),
        quantityTotal: Number(fd.get("quantityTotal")),
      }),
    });
    if (res.ok) {
      e.currentTarget.reset();
      await load(merchant.phone);
    }
  }

  async function markPickedUp(reservationId: string) {
    await fetch(`/api/giu/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "da_lay" }),
    });
    if (merchant) await load(merchant.phone);
  }

  if (loading && !merchant) {
    return <p className="text-giu-muted">Đang tải...</p>;
  }

  if (!merchant) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-giu-border bg-white p-6">
        <h2 className="text-lg font-semibold">Đăng nhập quản lý quán</h2>
        <p className="text-sm text-giu-muted">Nhập SĐT đã đăng ký quán</p>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
          placeholder="0901234567"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("giu_merchant_phone", phone);
            void load(phone);
          }}
          className="w-full rounded-xl bg-giu-primary py-2.5 text-sm font-semibold text-white"
        >
          Vào panel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-giu-border bg-white p-6">
        <h1 className="text-xl font-bold">{merchant.name}</h1>
        <p className="text-sm text-giu-muted">{merchant.address}</p>
        <p className="mt-2 text-sm">
          Đã giải cứu: <strong>{merchant.rescuedBoxes}</strong> hộp
          {merchant.verified ? (
            <span className="ml-2 rounded-full bg-giu-primary/10 px-2 py-0.5 text-xs text-giu-primary">
              ✓ Verified
            </span>
          ) : (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              Chờ xác minh
            </span>
          )}
        </p>
      </div>

      <section className="rounded-2xl border border-giu-border bg-white p-6">
        <h2 className="font-semibold">Đăng hộp mới (19h–21h tối nay)</h2>
        <form onSubmit={createBox} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Tên hộp *"
            className="rounded-xl border border-giu-border px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="description"
            placeholder="Mô tả (tuỳ chọn)"
            className="rounded-xl border border-giu-border px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="originalPriceVnd"
            required
            type="number"
            min={10000}
            placeholder="Giá gốc (VND) *"
            className="rounded-xl border border-giu-border px-3 py-2 text-sm"
          />
          <input
            name="salePriceVnd"
            required
            type="number"
            min={5000}
            placeholder="Giá giải cứu (VND) *"
            className="rounded-xl border border-giu-border px-3 py-2 text-sm"
          />
          <input
            name="quantityTotal"
            required
            type="number"
            min={1}
            max={50}
            defaultValue={5}
            placeholder="Số hộp *"
            className="rounded-xl border border-giu-border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-giu-accent py-2 text-sm font-semibold text-white sm:col-span-2"
          >
            Đăng hộp
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold">Hộp của quán ({boxes.length})</h2>
        <ul className="mt-4 space-y-3">
          {boxes.map((box) => (
            <li key={box.id} className="rounded-xl border border-giu-border bg-white p-4">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-medium">{box.title}</p>
                  <p className="text-sm text-giu-muted">
                    {formatVnd(box.salePriceVnd)} · Còn {box.quantityLeft}/{box.quantityTotal} ·{" "}
                    {box.status}
                  </p>
                  <p className="text-xs text-giu-muted">
                    {formatPickupWindow(box.pickupStart, box.pickupEnd)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Đơn giữ chỗ ({reservations.length})</h2>
        <ul className="mt-4 space-y-3">
          {reservations.slice(0, 20).map((r) => (
            <li key={r.id} className="rounded-xl border border-giu-border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-lg font-bold text-giu-primary">{r.code}</p>
                  <p className="text-sm">
                    {r.customerName} · {r.customerPhone}
                  </p>
                  <p className="text-sm text-giu-muted">
                    {formatVnd(r.totalVnd)} · {r.status}
                  </p>
                </div>
                {r.status === "giu_cho" ? (
                  <button
                    type="button"
                    onClick={() => markPickedUp(r.id)}
                    className="rounded-lg bg-giu-primary px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Đã lấy ✓
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
