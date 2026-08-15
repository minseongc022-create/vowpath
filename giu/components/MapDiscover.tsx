"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GIu_CATEGORIES } from "@/giu/lib/categories";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import {
  HCMC_CENTER,
  HCMC_DEFAULT_ZOOM,
  distanceMeters,
  formatDistance,
} from "@/giu/lib/geo";
import { categoryLabel } from "@/giu/lib/labels-locale";
import { googleMapsSearchUrl } from "@/giu/lib/links";
import type { GiuBox, GiuCategory } from "@/giu/lib/types";
import type { MapPin } from "@/giu/lib/map-pins";
import { useGiuLocale } from "./GiuLocaleProvider";
import { t } from "@/giu/lib/i18n";

type Props = {
  pins: MapPin[];
};

function pinIcon(count: number, selected: boolean) {
  const bg = selected ? "#2D3E4E" : "#6BA894";
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    html: `<div style="
      width:36px;height:36px;border-radius:18px 18px 18px 4px;
      background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;
      font:700 12px/1 system-ui,sans-serif;box-shadow:0 4px 12px rgba(45,62,78,.28);
      border:2px solid #fff;transform:rotate(-45deg);
    "><span style="transform:rotate(45deg)">${count}</span></div>`,
  });
}

function Recenter({ lat, lng, enabled }: { lat: number; lng: number; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [lat, lng, enabled, map]);
  return null;
}

export function MapDiscover({ pins }: Props) {
  const { locale } = useGiuLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GiuCategory | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [followUser, setFollowUser] = useState(false);
  const [locError, setLocError] = useState("");
  const [locating, setLocating] = useState(false);
  const [farFromHcmc, setFarFromHcmc] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pins
      .map((pin) => {
        const boxes = pin.boxes.filter((b) => {
          if (category && b.category !== category) return false;
          if (!q) return true;
          const hay = `${b.title} ${b.description ?? ""} ${pin.merchant.name} ${pin.merchant.address}`.toLowerCase();
          return hay.includes(q);
        });
        if (boxes.length === 0) return null;
        return { ...pin, boxes };
      })
      .filter((p): p is MapPin => Boolean(p));
  }, [pins, query, category]);

  const selected = filtered.find((p) => p.merchant.id === selectedId) ?? null;

  const sortedSelectedBoxes = selected
    ? [...selected.boxes].sort((a, b) => a.pickupStart.localeCompare(b.pickupStart))
    : [];

  function locateMe() {
    setLocError("");
    if (!("geolocation" in navigator)) {
      setLocError(t(locale, "locUnsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(next);
        const near = distanceMeters(next, HCMC_CENTER) < 80_000;
        setFarFromHcmc(!near);
        setFollowUser(near);
        setLocating(false);
      },
      () => {
        setLocError(t(locale, "locDenied"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(next);
        setFarFromHcmc(distanceMeters(next, HCMC_CENTER) >= 80_000);
        // Don't auto-fly — keep HCMC map for VN market (founder may test from KR).
        setFollowUser(false);
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  return (
    <div className="relative h-[calc(100dvh-54px-64px)] w-full overflow-hidden bg-giu-bg">
      <MapContainer
        center={[HCMC_CENTER.lat, HCMC_CENTER.lng]}
        zoom={HCMC_DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        {userPos ? (
          <>
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={8}
              pathOptions={{ color: "#2D3E4E", fillColor: "#9DCAB8", fillOpacity: 1, weight: 2 }}
            />
            <Recenter lat={userPos.lat} lng={userPos.lng} enabled={followUser} />
          </>
        ) : null}
        {filtered.map((pin) => (
          <Marker
            key={pin.merchant.id}
            position={[pin.lat, pin.lng]}
            icon={pinIcon(pin.boxes.length, selectedId === pin.merchant.id)}
            eventHandlers={{
              click: () => setSelectedId(pin.merchant.id),
            }}
          />
        ))}
      </MapContainer>

      {/* Top controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3">
        <div className="pointer-events-auto mx-auto max-w-[480px] space-y-2 md:max-w-xl">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(locale, "mapSearchPlaceholder")}
              className="giu-input flex-1 !bg-white/95 !py-2.5 shadow-giu-md backdrop-blur"
            />
            <button
              type="button"
              onClick={locateMe}
              disabled={locating}
              className="shrink-0 rounded-[14px] bg-giu-ink px-3 text-[12px] font-bold text-white shadow-giu-md"
            >
              {locating ? "…" : t(locale, "myLocation")}
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-sm ${
                !category ? "bg-giu-ink text-white" : "bg-white/95 text-giu-muted"
              }`}
            >
              {t(locale, "allCategories")}
            </button>
            {GIu_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id === category ? "" : c.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-sm ${
                  category === c.id ? "bg-giu-ink text-white" : "bg-white/95 text-giu-muted"
                }`}
              >
                {c.emoji} {categoryLabel(c.id, locale)}
              </button>
            ))}
          </div>
          {farFromHcmc ? (
            <p className="rounded-xl bg-white/95 px-3 py-1.5 text-[11px] font-medium text-giu-ink shadow">
              {t(locale, "mapHcmcFocus")}
            </p>
          ) : null}
          {locError ? (
            <p className="rounded-xl bg-white/95 px-3 py-1.5 text-[11px] font-medium text-giu-danger shadow">
              {locError}
            </p>
          ) : null}
          <p className="text-[11px] font-semibold text-giu-ink/80">
            <span className="rounded-full bg-white/90 px-2.5 py-1 shadow">
              {filtered.length} {t(locale, "mapStoresOpen")}
            </span>
          </p>
        </div>
      </div>

      {/* Bottom sheet */}
      {selected ? (
        <div className="absolute inset-x-0 bottom-0 z-[500] p-3 pb-3">
          <div className="mx-auto max-w-[480px] rounded-[20px] bg-white p-4 shadow-giu-md ring-1 ring-giu-border md:max-w-xl">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[16px] font-extrabold text-giu-ink">{selected.merchant.name}</p>
                <p className="mt-0.5 truncate text-[12px] text-giu-muted">{selected.merchant.address}</p>
                {userPos ? (
                  <p className="mt-1 text-[11px] font-semibold text-giu-accent">
                    {formatDistance(
                      distanceMeters(userPos, { lat: selected.lat, lng: selected.lng }),
                      locale,
                    )}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-full bg-giu-bg px-2.5 py-1 text-[12px] font-bold text-giu-muted"
              >
                ✕
              </button>
            </div>

            <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
              {sortedSelectedBoxes.map((box) => (
                <li key={box.id}>
                  <Link
                    href={`/giu/hop/${box.id}`}
                    className="flex items-center justify-between gap-2 rounded-[14px] bg-giu-bg px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-giu-ink">{box.title}</p>
                      <p className="text-[11px] text-giu-muted">
                        {formatPickupWindow(box.pickupStart, box.pickupEnd)} · {box.quantityLeft}{" "}
                        {t(locale, "left")}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13px] font-extrabold text-giu-ink">
                      {formatVnd(box.salePriceVnd)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex gap-2">
              <a
                href={googleMapsSearchUrl(selected.merchant.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="giu-btn-secondary flex-1 !py-2.5 text-[13px]"
              >
                {t(locale, "maps")}
              </a>
              {sortedSelectedBoxes[0] ? (
                <Link
                  href={`/giu/hop/${sortedSelectedBoxes[0].id}`}
                  className="giu-btn-primary flex-1 !py-2.5 text-[13px]"
                >
                  {t(locale, "rescueNow")}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="absolute inset-x-0 bottom-4 z-[500] px-3">
          <div className="mx-auto max-w-[480px] rounded-[16px] bg-white/95 px-4 py-3 text-center text-[13px] shadow-giu-md md:max-w-xl">
            <p className="font-bold text-giu-ink">{t(locale, "emptyBoxes")}</p>
            <p className="mt-1 text-giu-muted">{t(locale, "emptyBoxesHint")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
