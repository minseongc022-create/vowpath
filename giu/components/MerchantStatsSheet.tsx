"use client";

import { useState } from "react";
import { formatPickupWindowWithDate } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuI18nKey, type GiuLocale } from "@/giu/lib/i18n";
import { groupReservationsByCustomer } from "@/giu/lib/merchant-customer-history";
import {
  AUTO_NO_SHOW_REFUND_DAYS,
  resolveDisplayReservationStatus,
  resolvePickupPolicy,
} from "@/giu/lib/pickup-policy";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";
import { GiuBottomSheet } from "./GiuBottomSheet";
import { MerchantExtensionReview } from "./MerchantExtensionReview";
import { MerchantOrderStatusBadge } from "./MerchantOrderStatusBadge";

export type MerchantStatFilter =
  | "selling"
  | "awaiting"
  | "ghosted"
  | "settlement"
  | "pickupDone";

type SettlementView = "menu" | "done";

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
};

function titleKey(filter: MerchantStatFilter): GiuI18nKey {
  switch (filter) {
    case "selling":
      return "mOpenBoxes";
    case "awaiting":
      return "mAwaitingPickup";
    case "ghosted":
      return "mGhostedTitle";
    case "settlement":
      return "mSettlementMenu";
    case "pickupDone":
      return "mRescued";
  }
}

function emptyKey(filter: MerchantStatFilter): GiuI18nKey {
  switch (filter) {
    case "selling":
      return "mStatEmptySelling";
    case "awaiting":
      return "mStatEmptyAwaiting";
    case "ghosted":
      return "mStatEmptyGhosted";
    case "settlement":
      return "mStatEmptySettleDone";
    case "pickupDone":
      return "mStatEmptyPickupDone";
  }
}

function hintKey(filter: MerchantStatFilter): GiuI18nKey {
  switch (filter) {
    case "awaiting":
      return "mStatAwaitingHint";
    case "ghosted":
      return "mStatGhostedHint";
    case "settlement":
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
}: Props) {
  const [settlementView, setSettlementView] = useState<SettlementView>("menu");

  if (!filter) return null;

  const policy = resolvePickupPolicy(merchant);
  const selling = boxes.filter((b) => b.status === "mo" && b.quantityLeft > 0);

  const awaiting = reservations.filter((r) => {
    if (r.paymentStatus !== "paid") return false;
    const box = boxMap.get(r.boxId);
    return displayStatus(r, box, merchant) === "giu_cho";
  });

  const ghosted = reservations.filter((r) => {
    if (r.paymentStatus !== "paid") return false;
    if (r.extensionRequest?.status === "pending") return false;
    const box = boxMap.get(r.boxId);
    return displayStatus(r, box, merchant) === "het_han";
  });

  const pickupDone = reservations.filter((r) => r.status === "da_lay");

  const settleDone = reservations.filter(
    (r) => r.paymentStatus === "paid" && r.settlementStatus === "released" && r.status === "da_lay",
  );

  const settleDoneTotal = settleDone.reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);

  const titleId = "giu-merchant-stat-sheet-title";

  const resetAndClose = () => {
    setSettlementView("menu");
    hapticSelect();
    onClose();
  };

  return (
    <GiuBottomSheet
      open={open}
      onClose={resetAndClose}
      dismissLabel={t(locale, "mCloseSheet")}
      ariaLabelledBy={titleId}
    >
      <div className="space-y-3 p-4 pb-8">
        <h2 id={titleId} className="text-[17px] font-extrabold text-giu-ink">
          {t(locale, titleKey(filter))}
        </h2>
        <p className="text-[12px] font-semibold leading-relaxed text-giu-muted">
          {filter === "ghosted"
            ? t(locale, "mStatGhostedHint").replaceAll("{days}", String(AUTO_NO_SHOW_REFUND_DAYS))
            : t(locale, hintKey(filter))}
        </p>

        {filter === "settlement" && settlementView === "menu" ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                hapticSelect();
                setSettlementView("done");
              }}
              className="giu-card-flat flex w-full items-center justify-between p-4 text-left ring-1 ring-giu-border transition active:scale-[0.99]"
            >
              <div>
                <p className="text-[14px] font-bold text-giu-ink">{t(locale, "mSettleDone")}</p>
                <p className="mt-0.5 text-[12px] text-giu-muted">{t(locale, "mStatSettleDoneHint")}</p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-extrabold text-giu-primary">{money(settleDoneTotal)}</p>
                <p className="text-[11px] text-giu-muted">{settleDone.length}건</p>
              </div>
            </button>
          </div>
        ) : null}

        {filter === "settlement" && settlementView === "done" ? (
          <button
            type="button"
            onClick={() => {
              hapticSelect();
              setSettlementView("menu");
            }}
            className="text-[12px] font-bold text-giu-primary"
          >
            ← {t(locale, "mSettlementMenu")}
          </button>
        ) : null}

        {filter === "settlement" && settlementView === "done" && settleDone.length > 0 ? (
          <p className="rounded-[14px] bg-giu-accent-soft px-3 py-2.5 text-[13px] font-bold text-giu-ink">
            {t(locale, "mSettleDone")} {money(settleDoneTotal)}
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
        ) : filter === "settlement" && settlementView === "done" ? (
          settleDone.length === 0 ? (
            <p className="text-[13px] text-giu-muted">{t(locale, emptyKey("settlement"))}</p>
          ) : (
            <ul className="space-y-2">
              {settleDone.map((r) => {
                const box = boxMap.get(r.boxId);
                const net = r.totalVnd - r.platformFeeVnd;
                return (
                  <li key={r.id} className="giu-card-flat p-3 ring-1 ring-giu-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-giu-ink">{r.customerName}</p>
                        {box ? (
                          <p className="mt-0.5 text-[12px] text-giu-muted">{box.title}</p>
                        ) : null}
                      </div>
                      <p className="text-[14px] font-extrabold text-giu-primary">+ {money(net)}</p>
                    </div>
                    {r.settledAt ? (
                      <p className="mt-1 text-[11px] text-giu-muted">
                        {new Date(r.settledAt).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )
        ) : filter === "awaiting" || filter === "ghosted" ? (
          (() => {
            const list = filter === "awaiting" ? awaiting : ghosted;
            const groups = groupReservationsByCustomer(list);
            if (groups.length === 0) {
              return <p className="text-[13px] text-giu-muted">{t(locale, emptyKey(filter))}</p>;
            }
            return (
              <ul className="space-y-2.5">
                {groups.map((g) => {
                  const latest = [...g.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                  const box = latest ? boxMap.get(latest.boxId) : undefined;
                  const shown = latest ? displayStatus(latest, box, merchant) : "giu_cho";
                  return (
                    <li key={g.customerId} className="giu-card-flat p-3 ring-1 ring-giu-border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold text-giu-ink">{g.customerName}</p>
                          <p className="text-[12px] text-giu-muted">{g.customerPhone}</p>
                          {latest && box ? (
                            <p className="mt-1 text-[11px] text-giu-muted">
                              {box.title} · {formatPickupWindowWithDate(box.pickupStart, box.pickupEnd, "kr")}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {latest ? (
                            <MerchantOrderStatusBadge
                              locale={locale}
                              reservation={latest}
                              boxPickupEnd={box?.pickupEnd}
                              policy={policy}
                            />
                          ) : null}
                        </div>
                      </div>
                      {filter === "ghosted" && latest && box && latest.extensionRequest?.status !== "pending" ? (
                        <p className="mt-2 text-[11px] leading-snug text-amber-800">
                          {t(locale, "mAutoRefundHint").replaceAll(
                            "{days}",
                            String(AUTO_NO_SHOW_REFUND_DAYS),
                          )}
                        </p>
                      ) : null}
                      {filter === "awaiting" && latest && box && shown === "giu_cho" ? (
                        <div className="mt-2">
                          <MerchantExtensionReview
                            locale={locale}
                            reservation={latest}
                            boxPickupStart={box.pickupStart}
                            boxPickupEnd={box.pickupEnd}
                            onDone={onChanged}
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            );
          })()
        ) : filter === "pickupDone" ? (
          pickupDone.length === 0 ? (
            <p className="text-[13px] text-giu-muted">{t(locale, emptyKey(filter))}</p>
          ) : (
            <ul className="space-y-2">
              {pickupDone.map((r) => {
                const box = boxMap.get(r.boxId);
                return (
                  <li key={r.id} className="giu-card-flat p-3 ring-1 ring-giu-border">
                    <p className="text-[14px] font-bold text-giu-ink">{r.customerName}</p>
                    {box ? <p className="text-[12px] text-giu-muted">{box.title}</p> : null}
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </div>
    </GiuBottomSheet>
  );
}
