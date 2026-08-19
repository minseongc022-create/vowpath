"use client";

import { formatPickupWindowWithDate } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuI18nKey, type GiuLocale } from "@/giu/lib/i18n";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";
import { GiuBottomSheet } from "./GiuBottomSheet";

export type MerchantStatFilter = "selling" | "settlement";

type Props = {
  locale: GiuLocale;
  open: boolean;
  filter: MerchantStatFilter | null;
  onClose: () => void;
  boxes: GiuBox[];
  reservations: GiuReservation[];
  money: (n: number) => string;
};

function titleKey(filter: MerchantStatFilter): GiuI18nKey {
  return filter === "selling" ? "mOpenBoxes" : "mSettlementMenu";
}

export function MerchantStatsSheet({
  locale,
  open,
  filter,
  onClose,
  boxes,
  reservations,
  money,
}: Props) {
  if (!filter) return null;

  const selling = boxes.filter((b) => b.status === "mo" && b.quantityLeft > 0);
  const settleDone = reservations.filter(
    (r) => r.paymentStatus === "paid" && r.settlementStatus === "released" && r.status === "da_lay",
  );
  const settleDoneTotal = settleDone.reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);
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

        {filter === "selling" ? (
          selling.length === 0 ? (
            <p className="text-[13px] text-giu-muted">{t(locale, "mStatEmptySelling")}</p>
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
        ) : settleDone.length === 0 ? (
          <p className="text-[13px] text-giu-muted">{t(locale, "mStatEmptySettleDone")}</p>
        ) : (
          <>
            <p className="rounded-[14px] bg-giu-accent-soft px-3 py-2.5 text-[14px] font-bold text-giu-ink">
              {money(settleDoneTotal)}
            </p>
            <ul className="space-y-2">
              {settleDone.map((r) => {
                const net = r.totalVnd - r.platformFeeVnd;
                return (
                  <li key={r.id} className="giu-card-flat flex items-center justify-between gap-3 p-3 ring-1 ring-giu-border">
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-giu-ink">{r.customerName}</p>
                      {r.settledAt ? (
                        <p className="text-[11px] text-giu-muted">
                          {new Date(r.settledAt).toLocaleDateString("ko-KR")}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-[14px] font-extrabold text-giu-primary">+ {money(net)}</p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </GiuBottomSheet>
  );
}
