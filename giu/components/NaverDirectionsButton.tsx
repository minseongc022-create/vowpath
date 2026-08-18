"use client";

import type { MouseEvent } from "react";
import {
  naverMapsAppDirectionsUrl,
  naverMapsDirectionsUrl,
} from "@/giu/lib/links";
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

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

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

  const name = placeName ?? address;
  const webUrl = naverMapsDirectionsUrl({
    address,
    destination: hasCoords ? { lat, lng } : null,
    placeName: name,
  });

  function openDirections(event: MouseEvent<HTMLAnchorElement>) {
    hapticSelect();
    event.preventDefault();

    if (hasCoords && isMobileDevice()) {
      const appUrl = naverMapsAppDirectionsUrl({ lat: lat!, lng: lng!, name });
      window.location.assign(appUrl);
      window.setTimeout(() => {
        if (document.visibilityState !== "hidden") {
          window.location.assign(webUrl);
        }
      }, 900);
      return;
    }

    window.location.assign(webUrl);
  }

  return (
    <a
      href={webUrl}
      onClick={openDirections}
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
