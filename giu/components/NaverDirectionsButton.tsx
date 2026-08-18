"use client";

import { useEffect, useState } from "react";
import { naverMapsOpenHref } from "@/giu/lib/links";
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

  const [href, setHref] = useState(() =>
    naverMapsOpenHref({
      address,
      destination: hasCoords ? { lat: lat!, lng: lng! } : null,
      placeName: placeName ?? address,
    }),
  );

  useEffect(() => {
    setHref(
      naverMapsOpenHref({
        address,
        destination: hasCoords ? { lat: lat!, lng: lng! } : null,
        placeName: placeName ?? address,
        userAgent: navigator.userAgent,
      }),
    );
  }, [address, hasCoords, lat, lng, placeName]);

  return (
    <a
      href={href}
      onClick={() => hapticSelect()}
      className={
        primary
          ? `giu-btn-primary giu-btn-3d block w-full !py-3 text-center text-[13px] no-underline ${className}`
          : `giu-btn-secondary giu-btn-3d block w-full !py-3 text-center text-[13px] no-underline ${className}`
      }
      title={address}
    >
      {t(locale, "directionsInApp")}
    </a>
  );
}
