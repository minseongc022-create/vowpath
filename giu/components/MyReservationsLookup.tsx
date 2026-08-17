"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerLogoutLink } from "@/giu/components/CustomerLogoutLink";
import { PickupQrCode } from "@/giu/components/PickupQrCode";
import { formatReservationStatusLocale } from "@/giu/lib/box-ux";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuBox, GiuMerchant, GiuReservation, GiuReview } from "@/giu/lib/types";
import { GiuCustomerNavLink } from "./GiuCustomerNavLink";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";

type Enriched = GiuReservation & { box?: GiuBox | null; merchant?: GiuMerchant | null };
type CustomerFilter = "all" | "awaiting" | "done" | "cancelled";

export function MyReservationsLookup() {
  const { account, loading: authLoading } = useGiuAuth();
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const [list, setList] = useState<Enriched[]>([]);
  const [reviews, setReviews] = useState<GiuReview[]>([]);
  const [merchantMap, setMerchantMap] = useState<Map<string, GiuMerchant>>(new Map());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CustomerFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, merchantsRes, boxesRes, reviewsRes] = await Promise.all([
        fetch("/api/giu/reservations", { credentials: "include" }),
        fetch("/api/giu/merchants"),
        fetch("/api/giu/boxes"),
        fetch("/api/giu/reviews", { credentials: "include" }),
      ]);
      if (!res.ok) return;
      const data = (await res.json()) as { reservations: GiuReservation[] };
      const merchants = merchantsRes.ok
        ? ((await merchantsRes.json()) as { merchants: GiuMerchant[] }).merchants ?? []
        : [];
      const boxes = boxesRes.ok
        ? ((await boxesRes.json()) as { boxes: GiuBox[] }).boxes ?? []
        : [];
      const reviewData = reviewsRes.ok
        ? ((await reviewsRes.json()) as { reviews: GiuReview[] }).reviews ?? []
        : [];
      const mMap = new Map(merchants.map((m) => [m.id, m]));
      const boxMap = new Map(boxes.map((b) => [b.id, b]));
      setMerchantMap(mMap);
      setReviews(reviewData);
      setList(
        (data.reservations ?? []).map((r) => ({
          ...r,
          box: boxMap.get(r.boxId) ?? null,
          merchant: mMap.get(r.merchantId) ?? null,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "customer") void load();
  }, [account, load]);

  const activePickups = useMemo(
    () => list.filter((r) => r.paymentStatus === "paid" && r.status === "giu_cho"),
    [list],
  );

  const filtered = useMemo(() => {
    return list.filter((r) => {
      if (filter === "awaiting") return r.paymentStatus === "paid" && r.status === "giu_cho";
      if (filter === "done") return r.status === "da_lay";
      if (filter === "cancelled") return r.status === "huy" || r.paymentStatus === "refunded";
      return true;
    });
  }, [list, filter]);

  if (authLoading) {
    return <p className="text-[13px] text-giu-muted">{t(locale, "loading")}</p>;
  }

  if (!account) {
    return (
      <div className="giu-card space-y-3 text-center">
        <p className="text-[13px] text-giu-muted">{t(locale, "myCodesLogin")}</p>
        <GiuCustomerNavLink href={`${href(GIU_ROUTES.auth)}?role=customer`} className="giu-btn-primary giu-btn-3d block text-center">
          {t(locale, "loginSignup")}
        </GiuCustomerNavLink>
      </div>
    );
  }

  if (loading) {
    return <p className="text-[13px] text-giu-muted">{t(locale, "loading")}</p>;
  }

  if (list.length === 0) {
    return (
      <div className="space-y-3">
        <div className="giu-card text-center text-[13px] text-giu-muted">
          {t(locale, "noOrders")}{" "}
          <GiuCustomerNavLink href={href(GIU_ROUTES.customer.boxes)} className="font-bold text-giu-primary">
            {t(locale, "findBoxes")}
          </GiuCustomerNavLink>
        </div>
        <CustomerLogoutLink locale={locale} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activePickups.length > 0 ? (
        <div className="giu-card space-y-3">
          <div>
            <p className="text-[15px] font-bold text-giu-ink">{t(locale, "myActivePickup")}</p>
            <p className="mt-0.5 text-[12px] text-giu-muted">{t(locale, "myActivePickupHint")}</p>
          </div>
          {activePickups.map((r) => (
            <div key={r.id} className="space-y-3 rounded-[16px] bg-giu-bg/80 p-3 ring-1 ring-giu-border">
              <div>
                <p className="font-bold text-giu-ink">{r.merchant?.name ?? r.box?.title}</p>
                {r.box ? (
                  <p className="text-[12px] text-giu-muted">
                    {r.box.title} · {formatPickupWindow(r.box.pickupStart, r.box.pickupEnd)}
                  </p>
                ) : null}
                <p className="mt-1 text-[12px] font-semibold text-giu-ink">{formatVnd(r.totalVnd)}</p>
              </div>
              <PickupQrCode locale={locale} reservationId={r.id} />
              <GiuCustomerNavLink
                href={href(GIU_ROUTES.customer.reservation(r.id))}
                className="giu-btn-3d giu-tap block text-center text-[12px] font-bold text-giu-primary"
              >
                {t(locale, "myViewReservation")}
              </GiuCustomerNavLink>
            </div>
          ))}
        </div>
      ) : null}

      <div className="giu-card space-y-2.5">
        <p className="text-[15px] font-bold text-giu-ink">{t(locale, "myReservationsTitle")}</p>
        <div className="giu-filter-tabs">
          {(["all", "awaiting", "done", "cancelled"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                hapticSelect();
                setFilter(f);
              }}
              className={`giu-filter-tab giu-btn-3d ${filter === f ? "is-active" : ""}`}
            >
              {t(locale, f === "all" ? "mFilterAll" : f === "awaiting" ? "myFilterAwaiting" : f === "done" ? "myFilterDone" : "myFilterCancelled")}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="text-[13px] text-giu-muted">{t(locale, "mFilterEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r, i) => (
              <li key={r.id} className="giu-feed-item" style={{ animationDelay: `${i * 40}ms` }}>
                <GiuCustomerNavLink href={href(GIU_ROUTES.customer.reservation(r.id))} className="giu-list-row giu-btn-3d giu-tap block">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[15px] font-bold text-giu-ink">
                        {r.merchant?.name ?? r.box?.title ?? t(locale, "myCodes")}
                      </p>
                      <span className="text-[11px] font-semibold text-giu-muted">
                        {formatReservationStatusLocale(r.status, locale)}
                      </span>
                    </div>
                    {r.box ? (
                      <p className="truncate text-[12px] text-giu-muted">
                        {r.box.title} · {formatPickupWindow(r.box.pickupStart, r.box.pickupEnd)}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[12px] font-semibold text-giu-ink">
                      {formatVnd(r.totalVnd)}
                    </p>
                  </div>
                </GiuCustomerNavLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="giu-card space-y-2">
        <p className="text-[15px] font-bold text-giu-ink">{t(locale, "myReviewsTitle")}</p>
        {reviews.length === 0 ? (
          <p className="text-[13px] text-giu-muted">{t(locale, "myReviewsEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {reviews.slice(0, 8).map((review) => (
              <li key={review.id} className="rounded-[14px] bg-giu-bg p-3 ring-1 ring-giu-border">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-giu-gold">{"★".repeat(review.rating)}</p>
                  <time className="text-[11px] font-semibold text-giu-muted" dateTime={review.createdAt}>
                    {new Date(review.createdAt).toLocaleDateString("ko-KR")}
                  </time>
                </div>
                <p className="mt-1 text-[12px] font-semibold text-giu-ink">
                  {merchantMap.get(review.merchantId)?.name ?? t(locale, "reviews")}
                </p>
                {review.comment ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-giu-muted">{review.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CustomerLogoutLink locale={locale} />
    </div>
  );
}
