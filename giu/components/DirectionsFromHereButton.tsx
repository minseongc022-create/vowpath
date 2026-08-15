"use client";

import { useState } from "react";
import { googleMapsDirectionsUrl } from "@/giu/lib/links";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { useGiuLocale } from "./GiuLocaleProvider";
import { t } from "@/giu/lib/i18n";

type LatLng = { lat: number; lng: number };

type Props = {
  destination: LatLng;
  destinationAddress?: string;
  className?: string;
  /** Use primary filled style */
  primary?: boolean;
};

/**
 * Opens Google Maps turn-by-turn from the device’s current position
 * to the store. Requests geolocation if needed.
 */
export function DirectionsFromHereButton({
  destination,
  destinationAddress,
  className = "",
  primary = false,
}: Props) {
  const { locale } = useGiuLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function openWithOrigin(origin: LatLng | null) {
    const url = googleMapsDirectionsUrl({
      origin,
      destination,
      travelmode: "driving",
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function start() {
    hapticSelect();
    setError("");
    if (!("geolocation" in navigator)) {
      // Still open Maps with destination only — user can set start in the app
      openWithOrigin(null);
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        hapticConfirm();
        openWithOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setBusy(false);
        setError(t(locale, "locDenied"));
        // Fallback: destination-only directions (Maps will ask for start)
        openWithOrigin(null);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={
          primary
            ? "giu-btn-primary w-full !py-3 text-[13px]"
            : "giu-btn-secondary w-full !py-3 text-[13px]"
        }
        title={destinationAddress}
      >
        {busy ? t(locale, "directionsLocating") : t(locale, "directions")}
      </button>
      {error ? <p className="mt-1 text-center text-[11px] text-giu-muted">{error}</p> : null}
    </div>
  );
}
