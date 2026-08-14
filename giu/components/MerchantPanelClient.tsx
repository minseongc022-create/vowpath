"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GIu_CATEGORIES } from "@/giu/lib/categories";
import {
  formatBoxStatus,
  formatPaymentStatus,
  formatPickupWindow,
  formatReservationStatus,
  formatVnd,
} from "@/giu/lib/format";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";

export function MerchantPanelClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "orders" ? "orders" : "boxes";
  const { merchant, loading: authLoading } = useGiuAuth();
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
        setError("로그인 세션이 만료되었습니다.");
        return;
      }
      const bData = (await bRes.json()) as { boxes: GiuBox[] };
      const rData = (await rRes.json()) as { reservations: GiuReservation[] };
      setBoxes(bData.boxes ?? []);
      setReservations(rData.reservations ?? []);
    } catch {
      setError("데이터를 불러올 수 없습니다.");
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

  if (authLoading || loading || !merchant) {
    return <p className="text-giu-muted">불러오는 중...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="giu-card">
        <h1 className="text-xl font-bold">{merchant.name}</h1>
        <p className="text-sm text-giu-muted">{merchant.address}</p>
        <p className="mt-2 text-sm">
          구출 완료: <strong>{merchant.rescuedBoxes}</strong>박스
          {merchant.verified ? (
            <span className="ml-2 rounded-full bg-giu-primary/10 px-2 py-0.5 text-xs text-giu-primary">
              ✓ 인증됨
            </span>
          ) : (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              인증 대기
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-giu-muted">
          픽업 확인 후 가게에 정산됩니다.
        </p>
      </div>

      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}

      {tab === "boxes" ? (
        <>
          <section className="giu-card">
            <h2 className="font-semibold">새 박스 등록</h2>
            <form onSubmit={createBox} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                name="title"
                required
                placeholder="박스 이름 *"
                className="giu-input sm:col-span-2"
              />
              <select
                name="category"
                className="giu-input sm:col-span-2"
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
                placeholder="설명 (선택)"
                className="giu-input sm:col-span-2"
              />
              <input
                name="freshnessNote"
                placeholder="신선도 약속 (선택)"
                defaultValue="픽업 시간까지 신선하게 보관합니다."
                className="giu-input sm:col-span-2"
              />
              <input
                name="originalPriceVnd"
                required
                type="number"
                min={10000}
                placeholder="정가 (VND) *"
                className="giu-input"
              />
              <input
                name="salePriceVnd"
                required
                type="number"
                min={5000}
                placeholder="구출 가격 (VND) *"
                className="giu-input"
              />
              <input
                name="quantityTotal"
                required
                type="number"
                min={1}
                max={50}
                defaultValue={5}
                placeholder="수량 *"
                className="giu-input"
              />
              <button type="submit" className="giu-btn-primary py-3 sm:col-span-2">
                박스 등록
              </button>
            </form>
          </section>

          <section>
            <h2 className="font-semibold">등록된 박스 ({boxes.length})</h2>
            <ul className="mt-4 space-y-3">
              {boxes.map((box) => (
                <li key={box.id} className="giu-card-flat ring-1 ring-giu-border p-4">
                  <p className="font-medium">{box.title}</p>
                  <p className="text-sm text-giu-muted">
                    {formatVnd(box.salePriceVnd)} · 남은 {box.quantityLeft}/{box.quantityTotal} ·{" "}
                    {formatBoxStatus(box.status)}
                  </p>
                  <p className="text-xs text-giu-muted">
                    {formatPickupWindow(box.pickupStart, box.pickupEnd)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section>
          <h2 className="font-semibold">결제 완료 주문 ({reservations.length})</h2>
          <ul className="mt-4 space-y-3">
            {reservations.slice(0, 20).map((r) => (
              <li key={r.id} className="giu-card-flat ring-1 ring-giu-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-lg font-bold text-giu-primary">{r.code}</p>
                    <p className="text-sm">
                      {r.customerName} · {r.customerPhone}
                    </p>
                    <p className="text-sm text-giu-muted">
                      {formatVnd(r.totalVnd)} · {formatPaymentStatus(r.paymentStatus)} ·{" "}
                      {formatReservationStatus(r.status)}
                      {r.settlementStatus === "held"
                        ? " · 정산 대기"
                        : r.settlementStatus === "released"
                          ? " · 정산 완료"
                          : ""}
                    </p>
                  </div>
                  {r.status === "giu_cho" && r.paymentStatus === "paid" ? (
                    <button
                      type="button"
                      onClick={() => markPickedUp(r.id)}
                      className="rounded-xl bg-giu-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                      픽업 완료 ✓
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
