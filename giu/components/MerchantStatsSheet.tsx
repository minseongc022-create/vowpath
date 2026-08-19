"use client";

import { formatPaymentStatusLocale, formatReservationStatusLocale } from "@/giu/lib/box-ux";
import { formatPickupWindowWithDate } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuI18nKey, type GiuLocale } from "@/giu/lib/i18n";
import {
  resolveDisplayReservationStatus,
  resolvePickupPolicy,
} from "@/giu/lib/pickup-policy";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";
import { GiuBottomSheet } from "./GiuBottomSheet";
import { MerchantExtensionReview } from "./MerchantExtensionReview";
import { MerchantNoShowButton } from "./MerchantNoShowButton";
import { MerchantOrderStatusBadge } from "./MerchantOrderStatusBadge";
import { merchantCanMarkNoShow } from "@/giu/lib/pickup-policy";
import { ReservationChatButton } from "./ReservationChatButton";

export type MerchantStatFilter =
  | "selling"
  | "awaiting"
  | "pickupDone"
  | "settleHeld"
  | "settleDone";

type Props = {
  locale: GiuLocale;
  open: boolean;
  filter: MerchantStatFilter | null;
  onClose: () => void;
  boxes: GiuBox[];
  reservations: GiuReservation[];
  boxMap: Map<string, GiuBox>;
  money: (n: number) => string;
  onChanged: () => void;
  merchant: import("@/giu/lib/types").GiuMerchant;
  onSelectCustomer?: (customerId: string) => void;
};

function titleKey(filter: MerchantStatFilter): GiuI18nKey {
  switch (filter) {
    case "selling":
      return "mOpenBoxes";
    case "awaiting":
      return "mAwaitingPickup";
    case "pickupDone":
      return "mRescued";
    case "settleHeld":
      return "mSettleHeld";
    case "settleDone":
      return "mSettleDone";
  }
}

function emptyKey(filter: MerchantStatFilter): GiuI18nKey {
  switch (filter) {
    case "selling":
      return "mStatEmptySelling";
    case "awaiting":
      return "mStatEmptyAwaiting";
    case "pickupDone":
      return "mStatEmptyPickupDone";
    case "settleHeld":
      return "mStatEmptySettleHeld";
    case "settleDone":
      return "mStatEmptySettleDone";
  }
}

function hintKey(filter: MerchantStatFilter): GiuI18nKey {
  switch (filter) {
    case "awaiting":
      return "mStatAwaitingHint";
    case "settleHeld":
      return "mStatSettleHeldHint";
    case "settleDone":
      return "mStatSettleDoneHint";
    default:
      return "mStatSheetHint";
  }
}

function displayStatus(
  r: GiuReservation,
  box: GiuBox | undefined,
  merchant: import("@/giu/lib/types").GiuMerchant,
): GiuReservation["status"] {
  return resolveDisplayReservationStatus(
    r,
    box?.pickupEnd,
    resolvePickupPolicy(merchant),
  );
}

export function MerchantStatsSheet({
  locale,
  open,
  filter,
  onClose,
  boxes,
  reservations,
  boxMap,
  money,
  onChanged,
  merchant,
  onSelectCustomer,
}: Props) {
  if (!filter) return null;

  const policy = resolvePickupPolicy(merchant);
  const selling = boxes.filter((b) => b.status === "mo" && b.quantityLeft > 0);

  const awaiting = reservations.filter((r) => {
    if (r.paymentStatus !== "paid") return false;
    const box = boxMap.get(r.boxId);
    return displayStatus(r, box, merchant) === "giu_cho";
  });

  const pickupDone = reservations.filter((r) => r.status === "da_lay");

  const settleHeld = reservations.filter((r) => {
    if (r.paymentStatus !== "paid" || r.settlementStatus !== "held") return false;
    const box = boxMap.get(r.boxId);
    return displayStatus(r, box, merchant) === "het_han";
  });

  const settleDone = reservations.filter(
    (r) => r.paymentStatus === "paid" && r.settlementStatus === "released" && r.status === "da_lay",
  );

  const list =
    filter === "selling"
      ? null
      : filter === "awaiting"
        ? awaiting
        : filter === "pickupDone"
          ? pickupDone
          : filter === "settleHeld"
            ? settleHeld
            : settleDone;

  const titleId = "giu-merchant-stat-sheet-title";

  return (
    <GiuBottomSheet
      open={open}
      onClose={() => {
        hapticSelect();
        onClose();
      }}
      dismissLabel={t(locale, "mCloseSheet")}
      ariaLabelledBy={titleId}
    >
      <div className="space-y-3 p-4 pb-8">
        <h2 id={titleId} className="text-[17px] font-extrabold text-giu-ink">
          {t(locale, titleKey(filter))}
        </h2>
        <p className="text-[12px] font-semibold leading-relaxed text-giu-muted">
          {t(locale, hintKey(filter))}
        </p>

        {filter === "settleDone" && settleDone.length > 0 ? (
          <p className="rounded-[14px] bg-giu-accent-soft px-3 py-2.5 text-[13px] font-bold text-giu-ink">
            {t(locale, "mSettleDone")} {money(settleDone.reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0))}
          </p>
        ) : null}

        {filter === "settleHeld" && settleHeld.length > 0 ? (
          <p className="rounded-[14px] bg-amber-50 px-3 py-2.5 text-[13px] font-bold text-amber-900 ring-1 ring-amber-200/60">
            {t(locale, "mSettleHeld")} {money(settleHeld.reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0))}
          </p>
        ) : null}

        {filter === "selling" ? (
          selling.length === 0 ? (
            <p className="text-[13px] text-giu-muted">{t(locale, emptyKey(filter))}</p>
          ) : (
            <ul className="space-y-2">
              {selling.map((box) => (
                <li key={box.id} className="giu-card-flat p-3 ring-1 ring-giu-border">
                  <p className="text-[15px] font-bold text-giu-ink">{box.title}</p>
                  <p className="mt-0.5 text-[12px] text-giu-muted">
                    {formatPickupWindowWithDate(box.pickupStart, box.pickupEnd, "kr")}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-giu-ink">
                    {money(box.salePriceVnd)} · {t(locale, "mStatQtyLeft")} {box.quantityLeft}
                    {t(locale, "mUnitQty")}
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : list && list.length === 0 ? (
          <p className="text-[13px] text-giu-muted">{t(locale, emptyKey(filter))}</p>
        ) : filter === "settleDone" ? (
          <ul className="space-y-2">
            {settleDone.map((r) => {
              const box = boxMap.get(r.boxId);
              const net = r.totalVnd - r.platformFeeVnd;
              return (
                <li key={r.id} className="giu-card-flat p-3 ring-1 ring-giu-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-giu-ink">{r.customerName}</p>
                      {box ? (
                        <p className="mt-0.5 text-[12px] text-giu-muted">{box.title}</p>
                      ) : null}
                      {box ? (
                        <p className="text-[11px] text-giu-muted">
                          {formatPickupWindowWithDate(box.pickupStart, box.pickupEnd, "kr")}
                        </p>
                      ) : null}
                    </div>
                    <MerchantOrderStatusBadge
                      locale={locale}
                      reservation={r}
                      boxPickupEnd={box?.pickupEnd}
                      policy={policy}
                    />
                  </div>
                  <p className="mt-2 text-[13px] font-extrabold text-giu-primary">
                    + {money(net)}
                  </p>
                  {r.settledAt ? (
                    <p className="text-[11px] text-giu-muted">
                      {new Date(r.settledAt).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {t(locale, "mSettleDone")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="space-y-2.5">
            {list?.map((r) => {
              const box = boxMap.get(r.boxId);
              const net = r.totalVnd - r.platformFeeVnd;
              const shown = displayStatus(r, box, merchant);
              const isExpired = shown === "het_han";
              return (
                <li key={r.id} className="giu-card-flat p-3 ring-1 ring-giu-border">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {onSelectCustomer ? (
                        <button
                          type="button"
                          onClick={() => {
                            hapticSelect();
                            onSelectCustomer(r.customerId);
                          }}
                          className="w-full rounded-[12px] text-left transition active:bg-giu-bg/80"
                        >
                          <p className="text-[15px] font-bold text-giu-ink">{r.customerName}</p>
                          <p className="text-[13px] text-giu-muted">{r.customerPhone}</p>
                          <p className="mt-1 text-[10px] font-semibold text-giu-primary">
                            {t(locale, "mCustDetailTap")}
                          </p>
                        </button>
                      ) : (
                        <>
                          <p className="text-[15px] font-bold text-giu-ink">{r.customerName}</p>
                          <p className="text-[13px] text-giu-muted">{r.customerPhone}</p>
                        </>
                      )}
                      {box ? (
                        <p className="mt-2 text-[12px] font-semibold text-giu-ink">
                          {t(locale, "mOrderProduct")}: {box.title}
                        </p>
                      ) : null}
                      {box ? (
                        <p className="text-[11px] text-giu-muted">
                          {formatPickupWindowWithDate(box.pickupStart, box.pickupEnd, "kr")}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[12px] text-giu-muted">
                        {money(r.totalVnd)} · {t(locale, "mOrderNet")} {money(net)}
                      </p>
                      <p className="text-[12px] text-giu-muted">
                        {formatPaymentStatusLocale(r.paymentStatus, locale)} ·{" "}
                        {formatReservationStatusLocale(shown, locale)}
                      </p>
                    </div>
                    <MerchantOrderStatusBadge
                      locale={locale}
                      reservation={r}
                      boxPickupEnd={box?.pickupEnd}
                      policy={policy}
                    />
                  </div>
                  {r.paymentStatus === "paid" &&
                  (shown === "giu_cho" || shown === "het_han") &&
                  box ? (
                    <div className="mt-2 space-y-2">
                      {isExpired ? (
                        <p className="text-[11px] leading-snug text-amber-800">
                          {t(locale, "mLatePickupHint")}
                        </p>
                      ) : null}
                      <MerchantExtensionReview
                        locale={locale}
                        reservation={r}
                        boxPickupStart={box?.pickupStart}
                        boxPickupEnd={box?.pickupEnd}
                        onDone={onChanged}
                      />
                      {r.extensionRequest?.status !== "pending" &&
                      isExpired &&
                      merchantCanMarkNoShow(box.pickupEnd, policy) ? (
                        <MerchantNoShowButton
                          locale={locale}
                          reservationId={r.id}
                          onDone={onChanged}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {r.paymentStatus === "paid" &&
                  (shown === "giu_cho" || r.status === "da_lay" || shown === "het_han") ? (
                    <div className="mt-3">
                      <ReservationChatButton
                        locale={locale}
                        reservationId={r.id}
                        viewerRole="merchant"
                        peerName={r.customerName}
                        peerPhone={r.customerPhone}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </GiuBottomSheet>
  );
}
