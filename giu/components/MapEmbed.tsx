"use client";

import { GiuInAppDirections } from "./GiuInAppDirections";
import { GiuStorePinMap } from "./GiuStorePinMap";
import { useGiuLocale } from "./GiuLocaleProvider";
import { t } from "@/giu/lib/i18n";

type Props = {
  address: string;
  /** Store coordinates — enables in-app directions */
  destLat?: number;
  destLng?: number;
  className?: string;
  compact?: boolean;
};

export function MapEmbed({
  address,
  destLat,
  destLng,
  className = "",
  compact = false,
}: Props) {
  const { locale } = useGiuLocale();
  const hasCoords =
    typeof destLat === "number" &&
    typeof destLng === "number" &&
    Number.isFinite(destLat) &&
    Number.isFinite(destLng);

  return (
    <div className={`overflow-hidden rounded-[16px] ring-1 ring-giu-border ${className}`}>
      {hasCoords ? (
        <GiuStorePinMap lat={destLat} lng={destLng} compact={compact} />
      ) : (
        <div
          className={`flex items-center justify-center bg-giu-bg px-4 text-center text-[12px] font-medium text-giu-muted ${compact ? "h-36" : "h-48"}`}
        >
          {address}
        </div>
      )}
      <div className="space-y-2 bg-white px-3 py-2.5">
        <p className="text-center text-[11px] font-bold text-giu-ink">{address}</p>
        {hasCoords ? (
          <GiuInAppDirections
            destination={{ lat: destLat, lng: destLng }}
            destinationAddress={address}
            primary
          />
        ) : (
          <p className="text-center text-[11px] font-semibold text-giu-muted">
            {t(locale, "directionsNeedLoc")}
          </p>
        )}
      </div>
    </div>
  );
}
