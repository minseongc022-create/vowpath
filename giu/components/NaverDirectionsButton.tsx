"use client";

import { naverMapsDirectionsUrl } from "@/giu/lib/links";
import { hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import { useGiuLocale } from "./GiuLocaleProvider";

type Props = {
  address: string;
  lat?: number;
  lng?: number;
  placeName?: string;
  primary?: boolean;
  className?: string;
};

export function NaverDirectionsButton({
  address,
  lat,
  lng,
  placeName,
  primary = false,
  className = "",
}: Props) {
  const { locale } = useGiuLocale();
  const hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const webUrl = naverMapsDirectionsUrl({
    address,
    destination: hasCoords ? { lat, lng } : null,
    placeName,
  });

  function openDirections() {
    hapticSelect();
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={openDirections}
      className={
        primary
          ? `giu-btn-primary giu-btn-3d w-full !py-3 text-[13px] ${className}`
          : `giu-btn-secondary giu-btn-3d w-full !py-3 text-[13px] ${className}`
      }
      title={address}
    >
      {t(locale, "directionsInApp")}
    </button>
  );
}
