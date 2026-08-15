"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GIu_CATEGORIES } from "@/giu/lib/categories";
import {
  formatBoxStatus,
  formatPaymentStatus,
  formatPickupWindow,
  formatReservationStatus,
  formatVnd,
  hcmLocalToIso,
} from "@/giu/lib/format";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";
import { GiuLocaleToggle } from "./GiuLocaleProvider";
import { MerchantOrderAlerts } from "./MerchantOrderAlerts";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6–23

export function MerchantPanelClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "orders" ? "orders" : "boxes";
  const { merchant, loading: authLoading } = useGiuAuth();
  const [boxes, setBoxes] = useState<GiuBox[]>([]);
  const [reservations, setReservations] = useState<GiuReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [createError, setCreateError] = useState("");
  const [dayOffset, setDayOffset] = useState(0);
  const [startH, setStartH] = useState(12);
  const [endH, setEndH] = useState(14);

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

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    const paid = reservations.filter((r) => r.paymentStatus === "paid" || r.paymentStatus === "refunded");
    if (!q) return paid;
    return paid.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
  }, [reservations, orderQuery]);

  const settlementHeld = reservations
    .filter((r) => r.settlementStatus === "held")
    .reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);
  const settlementReleased = reservations
    .filter((r) => r.settlementStatus === "released")
    .reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);

  async function createBox(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!merchant) return;
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const start = Number(fd.get("pickupStartH") ?? startH);
    const end = Number(fd.get("pickupEndH") ?? endH);
    const day = Number(fd.get("dayOffset") ?? dayOffset);
    if (end <= start) {
      setCreateError("종료 시간은 시작보다 늦어야 합니다");
      return;
    }
    const pickupStart = hcmLocalToIso(day, start, 0);
    const pickupEnd = hcmLocalToIso(day, end, 0);
    const res = await fetch("/api/giu/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: fd.get("title"),
        description: fd.get("description") || undefined,
        imageUrl: String(fd.get("imageUrl") || "").trim() || undefined,
        category: fd.get("category") || undefined,
        originalPriceVnd: Number(fd.get("originalPriceVnd")),
        salePriceVnd: Number(fd.get("salePriceVnd")),
        quantityTotal: Number(fd.get("quantityTotal")),
        freshnessNote: fd.get("freshnessNote") || undefined,
        pickupStart,
        pickupEnd,
        expiresAt: pickupEnd,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setCreateError(data.error ?? "등록 실패");
      return;
    }
    e.currentTarget.reset();
    setDayOffset(0);
    setStartH(12);
    setEndH(14);
    await load(merchant.id);
  }

  async function closeBox(boxId: string) {
    if (!merchant) return;
    if (!window.confirm("이 박스를 마감할까요?")) return;
    await fetch(`/api/giu/boxes/${boxId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "huy" }),
    });
    await load(merchant.id);
  }

  async function markPickedUp(reservationId: string) {
    if (!window.confirm("손님이 픽업을 완료했나요?")) return;
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
    <div className="space-y-5">
      <div className="giu-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight">{merchant.name}</h1>
            <p className="mt-0.5 text-[12px] text-giu-muted">{merchant.address}</p>
          </div>
          <GiuLocaleToggle />
        </div>
        <p className="mt-2 text-[12px]">
          구출 <strong>{merchant.rescuedBoxes}</strong>
          {merchant.verified ? (
            <span className="ml-2 rounded-md bg-giu-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-giu-accent">
              ✓ 인증
            </span>
          ) : (
            <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              인증 대기
            </span>
          )}
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-[12px] bg-giu-bg px-3 py-2">
            <p className="text-[10px] font-medium text-giu-muted">정산 대기</p>
            <p className="font-extrabold text-giu-ink">{formatVnd(settlementHeld)}</p>
          </div>
          <div className="rounded-[12px] bg-giu-bg px-3 py-2">
            <p className="text-[10px] font-medium text-giu-muted">정산 완료</p>
            <p className="font-extrabold text-giu-ink">{formatVnd(settlementReleased)}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-giu-muted">수수료 12% · 픽업 확인 후 정산 · 언제든 등록</p>
      </div>

      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
      <MerchantOrderAlerts merchantId={merchant.id} onNewOrder={() => void load(merchant.id)} />

      {tab === "boxes" ? (
        <>
          <section className="giu-card">
            <h2 className="font-bold">박스 등록</h2>
            <p className="mt-1 text-[12px] text-giu-muted">시간 제한 없음 · 오늘/내일 아무 때나</p>
            <form onSubmit={createBox} className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <input name="title" required placeholder="박스 이름 *" className="giu-input sm:col-span-2" />
              <select name="category" className="giu-input sm:col-span-2" defaultValue={merchant.category}>
                {GIu_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
              <input name="description" placeholder="설명 (선택)" className="giu-input sm:col-span-2" />
              <input name="imageUrl" type="url" placeholder="사진 URL (https://…)" className="giu-input sm:col-span-2" />
              <input
                name="freshnessNote"
                placeholder="신선도 약속"
                defaultValue="픽업 시간까지 신선하게 보관합니다."
                className="giu-input sm:col-span-2"
              />

              <label className="text-[11px] font-medium text-giu-muted sm:col-span-2">픽업 일정</label>
              <select
                name="dayOffset"
                className="giu-input sm:col-span-2"
                value={dayOffset}
                onChange={(e) => setDayOffset(Number(e.target.value))}
              >
                <option value={0}>오늘</option>
                <option value={1}>내일</option>
              </select>
              <select
                name="pickupStartH"
                className="giu-input"
                value={startH}
                onChange={(e) => setStartH(Number(e.target.value))}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    시작 {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
              <select
                name="pickupEndH"
                className="giu-input"
                value={endH}
                onChange={(e) => setEndH(Number(e.target.value))}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    종료 {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>

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
                placeholder="구출가 (VND) *"
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
              {createError ? <p className="text-sm text-giu-danger sm:col-span-2">{createError}</p> : null}
              <button type="submit" className="giu-btn-primary py-3 sm:col-span-2">
                바로 등록
              </button>
            </form>
          </section>

          <section>
            <h2 className="font-bold">등록된 박스 ({boxes.length})</h2>
            {boxes.length === 0 ? (
              <p className="mt-3 text-[13px] text-giu-muted">아직 없어요. 위에서 바로 올려보세요.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {boxes.map((box) => (
                  <li key={box.id} className="giu-card-flat flex gap-3 p-3 ring-1 ring-giu-border">
                    {box.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={box.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    ) : null}
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{box.title}</p>
                        <p className="text-[12px] text-giu-muted">
                          {formatVnd(box.salePriceVnd)} · {box.quantityLeft}/{box.quantityTotal} ·{" "}
                          {formatBoxStatus(box.status)}
                        </p>
                        <p className="text-[11px] text-giu-muted">
                          {formatPickupWindow(box.pickupStart, box.pickupEnd)}
                        </p>
                      </div>
                      {box.status === "mo" ? (
                        <button
                          type="button"
                          onClick={() => void closeBox(box.id)}
                          className="shrink-0 rounded-xl bg-giu-bg px-3 py-1.5 text-[11px] font-bold text-giu-muted ring-1 ring-giu-border"
                        >
                          마감
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <section>
          <h2 className="font-bold">결제 완료 주문 ({filteredOrders.length})</h2>
          <input
            value={orderQuery}
            onChange={(e) => setOrderQuery(e.target.value)}
            placeholder="코드 · 이름 · 전화"
            className="giu-input mt-2"
          />
          {filteredOrders.length === 0 ? (
            <p className="mt-3 text-[13px] text-giu-muted">주문이 없습니다.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {filteredOrders.slice(0, 50).map((r) => (
                <li key={r.id} className="giu-card-flat p-3 ring-1 ring-giu-border">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-lg font-extrabold text-giu-accent">{r.code}</p>
                      <p className="text-[13px]">
                        {r.customerName} · {r.customerPhone}
                      </p>
                      <p className="text-[12px] text-giu-muted">
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
                        onClick={() => void markPickedUp(r.id)}
                        className="rounded-xl bg-giu-accent px-4 py-2 text-[13px] font-bold text-white"
                      >
                        픽업 완료 ✓
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
