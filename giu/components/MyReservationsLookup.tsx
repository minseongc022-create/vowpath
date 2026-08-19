"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerLogoutLink } from "@/giu/components/CustomerLogoutLink";
import { CO2_KG_PER_BOX, formatReservationStatusLocale } from "@/giu/lib/box-ux";
import { formatPickupWindowWithDate, formatVnd } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import { resolveDisplayReservationStatus } from "@/giu/lib/pickup-policy";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuBox, GiuMerchant, GiuReservation, GiuReview } from "@/giu/lib/types";
import { GiuCustomerNavLink } from "./GiuCustomerNavLink";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";

type Enriched = GiuReservation & { box?: GiuBox | null; merchant?: GiuMerchant | null };
type CustomerFilter = "all" | "awaiting" | "expired" | "done" | "cancelled";

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

  const impact = useMemo(() => {
    const paid = list.filter(
      (r) => r.paymentStatus === "paid" || r.status === "da_lay" || r.paymentStatus === "refunded",
    );
    const retail = paid.reduce((s, r) => {
      const unit = r.box?.originalPriceVnd ?? Math.round(r.totalVnd / Math.max(1, r.quantity));
      return s + unit * r.quantity;
    }, 0);
    const spent = paid.reduce((sum, r) => sum + r.totalVnd, 0);
    return {
      retail,
      spent,
      saved: Math.max(0, retail - spent),
      count: paid.length,
      co2: paid.reduce((s, r) => s + r.quantity, 0) * CO2_KG_PER_BOX,
    };
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter((r) => {
      const shown = resolveDisplayReservationStatus(r, r.box?.pickupEnd);
      if (filter === "awaiting") {
        return r.paymentStatus === "paid" && shown === "giu_cho";
      }
      if (filter === "expired") {
        return r.paymentStatus === "paid" && shown === "het_han";
      }
      if (filter === "done") return r.status === "da_lay";
      if (filter === "cancelled") return r.status === "huy" || r.paymentStatus === "refunded";
      return true;
    });
  }, [list, filter]);

  function statusLabel(r: Enriched): string {
    const shown = resolveDisplayReservationStatus(r, r.box?.pickupEnd);
    if (shown === "het_han") return t(locale, "statusHetHan");
    return formatReservationStatusLocale(shown, locale);
  }

  function statusClass(r: Enriched): string {
    const shown = resolveDisplayReservationStatus(r, r.box?.pickupEnd);
    if (shown === "het_han") return "font-bold text-amber-800";
    if (shown === "giu_cho") return "font-semibold text-giu-primary";
    return "font-semibold text-giu-muted";
  }

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
      <div className="giu-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-giu-muted">
          {t(locale, "impactTitle")}
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-xl bg-giu-bg px-3 py-2.5 ring-1 ring-giu-border">
            <p className="text-[10px] font-semibold text-giu-muted">{t(locale, "impactRetail")}</p>
            <p className="text-[15px] font-extrabold text-giu-ink">{formatVnd(impact.retail)}</p>
          </div>
          <div className="rounded-xl bg-giu-bg px-3 py-2.5 ring-1 ring-giu-border">
            <p className="text-[10px] font-semibold text-giu-muted">{t(locale, "impactPaid")}</p>
            <p className="text-[15px] font-extrabold text-giu-ink">{formatVnd(impact.spent)}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-[13px] font-bold text-giu-primary">
          {t(locale, "impactSaved")} {formatVnd(impact.saved)}
        </p>
      </div>

      <div className="giu-card space-y-2.5">
        <p className="text-[15px] font-bold text-giu-ink">{t(locale, "myReservationsTitle")}</p>
        <div className="giu-filter-tabs">
          {(["all", "awaiting", "expired", "done", "cancelled"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                hapticSelect();
                setFilter(f);
              }}
              className={`giu-filter-tab giu-btn-3d ${filter === f ? "is-active" : ""}`}
            >
              {t(
                locale,
                f === "all"
                  ? "mFilterAll"
                  : f === "awaiting"
                    ? "myFilterAwaiting"
                    : f === "expired"
                      ? "myFilterExpired"
                      : f === "done"
                        ? "myFilterDone"
                        : "myFilterCancelled",
              )}
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
                      <span className={`text-[11px] ${statusClass(r)}`}>{statusLabel(r)}</span>
                    </div>
                    {r.box ? (
                      <p className="truncate text-[12px] text-giu-muted">
                        {r.box.title} · {formatPickupWindowWithDate(r.box.pickupStart, r.box.pickupEnd)}
                      </p>
                    ) : null}
                    {r.status === "het_han" ||
                    resolveDisplayReservationStatus(r, r.box?.pickupEnd) === "het_han" ? (
                      <p className="mt-1 text-[11px] font-semibold text-amber-800">
                        {t(locale, "cExpiredListHint")}
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
