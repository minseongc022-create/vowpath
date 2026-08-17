"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import {
  fetchDrivingRoute,
  formatOsrmDuration,
  formatRouteDistance,
  type LatLng,
  type RouteResult,
} from "@/giu/lib/routing";
import { useGiuLocale } from "./GiuLocaleProvider";

const GiuRouteMapInner = dynamic(() => import("@/giu/components/GiuRouteMapInner"), {
  ssr: false,
  loading: () => <div className="flex h-44 items-center justify-center bg-giu-bg text-[12px] text-giu-muted">…</div>,
});

type Props = {
  destination: LatLng;
  destinationAddress?: string;
  primary?: boolean;
  className?: string;
};

export function GiuInAppDirections({
  destination,
  destinationAddress,
  primary = false,
  className = "",
}: Props) {
  const { locale } = useGiuLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);

  async function startNavigation() {
    setError("");
    setOpen(true);
    setBusy(true);

    const locate = (): Promise<LatLng> =>
      new Promise((resolve, reject) => {
        if (!("geolocation" in navigator)) {
          reject(new Error("unsupported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => reject(new Error("denied")),
          { enableHighAccuracy: true, timeout: 12000 },
        );
      });

    try {
      const origin = await locate();
      const result = await fetchDrivingRoute(origin, destination);
      if (!result) {
        setError(t(locale, "directionsRouteFail"));
        return;
      }
      hapticConfirm();
      setUserPos(origin);
      setRoute(result);
      setOpen(true);
    } catch (err) {
      if (err instanceof Error && err.message === "denied") {
        setError(t(locale, "locDenied"));
      } else {
        setError(t(locale, "directionsRouteFail"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void startNavigation()}
        disabled={busy}
        className={
          primary
            ? "giu-btn-primary giu-btn-3d w-full !py-3 text-[13px]"
            : "giu-btn-secondary giu-btn-3d w-full !py-3 text-[13px]"
        }
        title={destinationAddress}
      >
        {busy ? t(locale, "directionsLocating") : t(locale, "directionsInApp")}
      </button>
      {error ? <p className="mt-1 text-center text-[11px] text-giu-muted">{error}</p> : null}
      {open && userPos && route ? (
        <div className="mt-2 overflow-hidden rounded-[16px] ring-1 ring-giu-border">
          <GiuRouteMapInner userPos={userPos} destination={destination} route={route} />
          <div className="space-y-0.5 bg-white px-3 py-2.5 text-center">
            <p className="text-[13px] font-bold text-giu-ink">
              {formatRouteDistance(route.distanceMeters)} · {formatOsrmDuration(route.durationSeconds, locale)}
            </p>
            <p className="text-[11px] font-semibold text-giu-muted">{t(locale, "directionsInAppHint")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
