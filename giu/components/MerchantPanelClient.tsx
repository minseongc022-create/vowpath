"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GIu_CATEGORIES } from "@/giu/lib/categories";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";

export function MerchantPanelClient() {
  const router = useRouter();
  const { account, merchant, loading: authLoading, logout } = useGiuAuth();
  const [boxes, setBoxes] = useState<GiuBox[]>([]);
  const [reservations, setReservations] = useState<GiuReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (merchantId: string) => {
    setLoading(true);
    setError("");
    try {
      const [bRes, rRes] = await Promise.all([
        fetch(`/api/giu/boxes?merchantId=${merchantId}`, { credentials: "include" }),
        fetch(`/api/giu/reservations?merchantId=${merchantId}`, { credentials: "include" }),
      ]);
      if (bRes.status === 401 || rRes.status === 401) {
        setError("Phiên đăng nhập hết hạn.");
        return;
      }
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
    if (merchant) void load(merchant.id);
    else if (!authLoading) setLoading(false);
  }, [merchant, authLoading, load]);

  async function createBox(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!merchant) return;
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/giu/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: fd.get("title"),
        description: fd.get("description") || undefined,
        category: fd.get("category") || undefined,
        originalPriceVnd: Number(fd.get("originalPriceVnd")),
        salePriceVnd: Number(fd.get("salePriceVnd")),
        quantityTotal: Number(fd.get("quantityTotal")),
        freshnessNote: fd.get("freshnessNote") || undefined,
      }),
    });
    if (res.ok) {
      e.currentTarget.reset();
      await load(merchant.id);
    }
  }

  async function markPickedUp(reservationId: string) {
    await fetch(`/api/giu/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "da_lay" }),
    });
    if (merchant) await load(merchant.id);
  }

  if (authLoading || (loading && !merchant)) {
    return <p className="text-giu-muted">Đang tải...</p>;
  }

  if (!account || account.role !== "merchant" || !merchant) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-giu-border bg-white p-6 text-center">
        <h2 className="text-lg font-semibold">Quản lý quán</h2>
        <p className="text-sm text-giu-muted">Đăng nhập bằng email quán để đăng hộp và xác nhận đơn.</p>
        <Link
          href="/giu/cua-hang/dang-nhap"
          className="inline-block w-full rounded-xl bg-giu-primary py-2.5 text-sm font-semibold text-white"
        >
          Đăng nhập quán
        </Link>
        <Link href="/giu/cua-hang" className="text-sm font-semibold text-giu-primary">
          Đăng ký quán mới →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-giu-border bg-white p-6">
        <div>
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
          <p className="mt-1 text-xs text-giu-muted">
            Khách đã thanh toán trước — bạn chỉ cần xác nhận mã khi họ tới lấy.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.push("/giu/cua-hang/dang-nhap");
          }}
          className="text-sm text-giu-muted hover:text-giu-ink"
        >
          Đăng xuất
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-2xl border border-giu-border bg-white p-6">
        <h2 className="font-semibold">Đăng hộp mới — mọi loại món ăn</h2>
        <p className="mt-1 text-sm text-giu-muted">
          Bánh, cơm, phở, trà sữa… miễn còn tươi đến giờ khách lấy là được.
        </p>
        <form onSubmit={createBox} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Tên hộp *"
            className="rounded-xl border border-giu-border px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            name="category"
            className="rounded-xl border border-giu-border px-3 py-2 text-sm sm:col-span-2"
            defaultValue={merchant.category}
          >
            {GIu_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          <input
            name="description"
            placeholder="Mô tả (tuỳ chọn)"
            className="rounded-xl border border-giu-border px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="freshnessNote"
            placeholder="Cam kết độ tươi (tuỳ chọn)"
            defaultValue="Giữ tươi cho đến khi khách đến lấy trong khung giờ."
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
              <p className="font-medium">{box.title}</p>
              <p className="text-sm text-giu-muted">
                {formatVnd(box.salePriceVnd)} · Còn {box.quantityLeft}/{box.quantityTotal} · {box.status}
              </p>
              <p className="text-xs text-giu-muted">
                {formatPickupWindow(box.pickupStart, box.pickupEnd)}
              </p>
              {box.freshnessNote ? (
                <p className="mt-1 text-xs text-giu-primary">{box.freshnessNote}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Đơn đã thanh toán ({reservations.length})</h2>
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
                    {formatVnd(r.totalVnd)} · {r.paymentStatus} · {r.status}
                  </p>
                </div>
                {r.status === "giu_cho" && r.paymentStatus === "paid" ? (
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
