"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GIu_CATEGORIES } from "@/giu/lib/categories";
import {
  formatDiscount,
  formatPickupDate,
  formatPickupWindow,
  formatVnd,
} from "@/giu/lib/format";
import {
  INCHEON_CENTER,
  INCHEON_DEFAULT_ZOOM,
  distanceMeters,
  formatDistance,
} from "@/giu/lib/geo";
import { hapticSelect } from "@/giu/lib/haptics";
import { categoryLabel, districtLabel } from "@/giu/lib/labels-locale";
import {
  fetchDrivingRoute,
  formatOsrmDuration,
  formatRouteDistance,
  type RouteResult,
} from "@/giu/lib/routing";
import {
  formatRatingLine,
  isClosingSoon,
  isLowStock,
} from "@/giu/lib/box-ux";
import type { GiuCategory } from "@/giu/lib/types";
import type { MapPin } from "@/giu/lib/map-pins";
import { useGiuLocale } from "./GiuLocaleProvider";
import { GiuCustomerNavLink } from "./GiuCustomerNavLink";
import { WaitlistForm } from "./WaitlistForm";
import { useGiuHref } from "./GiuNavProvider";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { t } from "@/giu/lib/i18n";

const GiuRouteMapInner = dynamic(() => import("@/giu/components/GiuRouteMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 items-center justify-center bg-giu-bg text-[12px] text-giu-muted">…</div>
  ),
});

type Props = {
  pins: MapPin[];
};

function pinIcon(count: number, selected: boolean) {
  const bg = selected ? "#3C2A21" : "#F9A825";
  return L.divIcon({
    className: "giu-map-pin-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    html: `<div style="
      width:36px;height:36px;border-radius:18px 18px 18px 5px;
      background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;
      font:800 12px/1 Pretendard,system-ui,sans-serif;
      box-shadow:0 4px 14px rgba(31,42,51,.28);
      border:2px solid #fff;transform:rotate(-45deg);
    "><span style="transform:rotate(45deg)">${count}</span></div>`,
  });
}

function Recenter({ lat, lng, enabled }: { lat: number; lng: number; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.65 });
  }, [lat, lng, enabled, map]);
  return null;
}

function FlyTo({
  lat,
  lng,
  zoom,
  onDone,
}: {
  lat: number;
  lng: number;
  zoom: number;
  onDone: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.55 });
    const timer = window.setTimeout(onDone, 650);
    return () => window.clearTimeout(timer);
  }, [lat, lng, zoom, map, onDone]);
  return null;
}

function FitRoute({ latLngs }: { latLngs: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (latLngs.length < 2) return;
    const bounds = L.latLngBounds(latLngs.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [72, 72], maxZoom: 16, animate: true });
  }, [latLngs, map]);
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute right-3 top-[7.25rem] z-[500] flex flex-col gap-1">
      <button
        type="button"
        className="giu-map-fab"
        aria-label="zoom in"
        onClick={() => map.zoomIn()}
      >
        +
      </button>
      <button
        type="button"
        className="giu-map-fab"
        aria-label="zoom out"
        onClick={() => map.zoomOut()}
      >
        −
      </button>
    </div>
  );
}

export function MapDiscover({ pins }: Props) {
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GiuCategory | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [followUser, setFollowUser] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(
    null,
  );
  const [locError, setLocError] = useState("");
  const [locating, setLocating] = useState(false);
  const [farFromServiceCity, setFarFromServiceCity] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [navBusy, setNavBusy] = useState(false);
  const [navError, setNavError] = useState("");

  const clearFly = useCallback(() => setFlyTarget(null), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pins
      .map((pin) => {
        const boxes = pin.boxes.filter((b) => {
          if (category && b.category !== category) return false;
          if (!q) return true;
          const hay =
            `${b.title} ${b.description ?? ""} ${pin.merchant.name} ${pin.merchant.address}`.toLowerCase();
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

  const nearbyCards = useMemo(() => {
    const withDist = filtered.map((pin) => {
      const dist = userPos
        ? distanceMeters(userPos, { lat: pin.lat, lng: pin.lng })
        : distanceMeters(INCHEON_CENTER, { lat: pin.lat, lng: pin.lng });
      const best = [...pin.boxes].sort((a, b) => a.salePriceVnd - b.salePriceVnd)[0];
      return { pin, dist, best };
    });
    withDist.sort((a, b) => a.dist - b.dist);
    return withDist.slice(0, 12);
  }, [filtered, userPos]);

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
        const near = distanceMeters(next, INCHEON_CENTER) < 80_000;
        setFarFromServiceCity(!near);
        setFollowUser(near);
        if (near) setFlyTarget({ lat: next.lat, lng: next.lng, zoom: 15 });
        setLocating(false);
      },
      () => {
        setLocError(t(locale, "locDenied"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  function focusCity() {
    setFollowUser(false);
    setFlyTarget({ lat: INCHEON_CENTER.lat, lng: INCHEON_CENTER.lng, zoom: INCHEON_DEFAULT_ZOOM });
  }

  function openDirections() {
    if (!selected) return;
    hapticSelect();
    setNavError("");
    setNavOpen(true);

    const dest = { lat: selected.lat, lng: selected.lng };
    if (userPos && route) return;

    if (userPos) {
      setNavBusy(true);
      void fetchDrivingRoute(userPos, dest).then((result) => {
        setRoute(result);
        setNavBusy(false);
        if (!result) setNavError(t(locale, "directionsRouteFail"));
      });
      return;
    }

    if (!("geolocation" in navigator)) {
      setNavError(t(locale, "locUnsupported"));
      return;
    }
    setNavBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(next);
        setFarFromServiceCity(distanceMeters(next, INCHEON_CENTER) >= 80_000);
        void fetchDrivingRoute(next, dest).then((result) => {
          setRoute(result);
          setNavBusy(false);
          if (!result) setNavError(t(locale, "directionsRouteFail"));
        });
      },
      () => {
        setNavError(t(locale, "directionsNeedLoc"));
        setNavBusy(false);
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
        setFarFromServiceCity(distanceMeters(next, INCHEON_CENTER) >= 80_000);
        setFollowUser(false);
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  // Draw driving route from current position → selected store
  useEffect(() => {
    if (!selected || !userPos) {
      setRoute(null);
      return;
    }
    const far = distanceMeters(userPos, INCHEON_CENTER) >= 80_000;
    // Don't route across countries when tester is in Korea etc.
    if (far) {
      setRoute(null);
      return;
    }
    const ac = new AbortController();
    setRouting(true);
    void fetchDrivingRoute(userPos, { lat: selected.lat, lng: selected.lng }, ac.signal).then(
      (result) => {
        if (ac.signal.aborted) return;
        setRoute(result);
        setRouting(false);
      },
    );
    return () => {
      ac.abort();
      setRouting(false);
    };
  }, [selected, userPos]);

  return (
    <div className="giu-map-root relative h-full min-h-[50vh] w-full overflow-hidden bg-[#dfe8ef]">
      <MapContainer
        center={[INCHEON_CENTER.lat, INCHEON_CENTER.lng]}
        zoom={INCHEON_DEFAULT_ZOOM}
        maxZoom={20}
        minZoom={11}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
        preferCanvas
      >
        {/* Carto Voyager @2x — bright consumer basemap (Naver-like clarity) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
          maxNativeZoom={20}
          detectRetina
          keepBuffer={3}
          updateWhenZooming={false}
          attribution="&copy; OSM &copy; CARTO"
        />
        <ZoomControls />
        {flyTarget ? (
          <FlyTo
            lat={flyTarget.lat}
            lng={flyTarget.lng}
            zoom={flyTarget.zoom}
            onDone={clearFly}
          />
        ) : null}
        {userPos ? (
          <>
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#2F7CF6",
                fillOpacity: 1,
                weight: 3,
              }}
            />
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={20}
              pathOptions={{
                color: "#2F7CF6",
                fillColor: "#2F7CF6",
                fillOpacity: 0.14,
                weight: 0,
              }}
            />
            <Recenter lat={userPos.lat} lng={userPos.lng} enabled={followUser && !flyTarget} />
          </>
        ) : null}
        {filtered.map((pin) => (
          <Marker
            key={pin.merchant.id}
            position={[pin.lat, pin.lng]}
            icon={pinIcon(pin.boxes.length, selectedId === pin.merchant.id)}
            eventHandlers={{
              click: () => {
                setSelectedId(pin.merchant.id);
                setFollowUser(false);
                setNavOpen(false);
                setFlyTarget({ lat: pin.lat, lng: pin.lng, zoom: 16 });
              },
            }}
          />
        ))}
        {route && route.latLngs.length >= 2 ? (
          <>
            <Polyline
              positions={route.latLngs}
              pathOptions={{
                color: "#2F7CF6",
                weight: 5,
                opacity: 0.92,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
            {!flyTarget ? <FitRoute latLngs={route.latLngs} /> : null}
          </>
        ) : null}
      </MapContainer>

      {/* Top search + filters */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3">
        <div className="pointer-events-auto mx-auto max-w-[480px] space-y-2 md:max-w-xl">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-[0_10px_30px_rgba(31,42,51,0.12)] ring-1 ring-black/[0.04]">
            <span className="pl-3 text-[15px] text-giu-muted" aria-hidden>
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(locale, "mapSearchPlaceholder")}
              className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-[15px] font-medium text-giu-ink outline-none placeholder:font-normal placeholder:text-giu-muted"
            />
            {query ? (
              <button
                type="button"
                className="giu-btn-3d giu-tap mr-1 rounded-xl px-2.5 py-1.5 text-[12px] font-bold text-giu-muted"
                onClick={() => setQuery("")}
              >
                ✕
              </button>
            ) : null}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`giu-btn-3d giu-tap shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold shadow-sm ${
                !category
                  ? "bg-giu-ink text-white"
                  : "bg-white/95 text-giu-ink ring-1 ring-black/[0.05]"
              }`}
            >
              {t(locale, "allCategories")}
            </button>
            {GIu_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id === category ? "" : c.id)}
                className={`giu-btn-3d giu-tap shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold shadow-sm ${
                  category === c.id
                    ? "bg-giu-ink text-white"
                    : "bg-white/95 text-giu-ink ring-1 ring-black/[0.05]"
                }`}
              >
                {c.emoji} {categoryLabel(c.id, locale)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-giu-ink shadow-sm ring-1 ring-black/[0.04]">
              {filtered.length} {t(locale, "mapStoresOpen")}
            </span>
            {farFromServiceCity ? (
              <button
                type="button"
                onClick={focusCity}
                className="giu-btn-3d giu-tap rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-giu-primary shadow-sm ring-1 ring-black/[0.04]"
              >
                {t(locale, "mapIncheonFocus")} ↓
              </button>
            ) : null}
          </div>
          {locError ? (
            <p className="rounded-xl bg-white px-3 py-2 text-[11px] font-medium text-giu-danger shadow">
              {locError}
            </p>
          ) : null}
        </div>
      </div>

      {/* Locate */}
      <button
        type="button"
        onClick={locateMe}
        disabled={locating}
        className="giu-map-fab giu-btn-3d absolute bottom-[7.75rem] right-3 z-[500] !h-11 !w-11"
        aria-label={t(locale, "myLocation")}
        title={t(locale, "myLocation")}
      >
        {locating ? (
          <span className="text-[13px]">…</span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="3.2" fill="currentColor" />
            <path
              d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </button>

      {/* Bottom sheet OR nearby strip */}
      {selected ? (
        <div className="absolute inset-x-0 bottom-0 z-[500] p-3 pb-3">
          <div className="mx-auto max-w-[480px] overflow-hidden rounded-[22px] bg-white shadow-[0_-10px_40px_rgba(31,42,51,0.16)] ring-1 ring-black/[0.04] md:max-w-xl">
            <div className="flex justify-center pt-2">
              <span className="h-1 w-9 rounded-full bg-giu-border" />
            </div>
            <div className="space-y-3 p-4 pt-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <GiuCustomerNavLink
                    href={href(GIU_ROUTES.customer.merchant(selected.merchant.id))}
                    className="giu-link-plain block truncate text-[17px] font-extrabold tracking-tight text-giu-ink underline-offset-2 hover:underline"
                  >
                    {selected.merchant.name}
                  </GiuCustomerNavLink>
                  <p className="mt-0.5 line-clamp-1 text-[12px] font-medium text-giu-muted">
                    {districtLabel(selected.merchant.district, locale)} · {selected.merchant.address}
                  </p>
                  {formatRatingLine(
                    selected.merchant.rating,
                    selected.merchant.reviewCount,
                    locale,
                  ) ? (
                    <p className="mt-1 text-[11px] font-bold text-giu-ink">
                      {formatRatingLine(
                        selected.merchant.rating,
                        selected.merchant.reviewCount,
                        locale,
                      )}
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    {route ? (
                      <span className="rounded-md bg-[#E8F1FE] px-2 py-0.5 text-[#2F7CF6]">
                        {t(locale, "directionsEta")}{" "}
                        {formatOsrmDuration(route.durationSeconds, locale)} ·{" "}
                        {formatDistance(route.distanceMeters, locale)}
                      </span>
                    ) : userPos && !farFromServiceCity ? (
                      <span className="rounded-md bg-giu-accent-soft px-2 py-0.5 text-giu-primary">
                        {routing
                          ? "…"
                          : formatDistance(
                              distanceMeters(userPos, { lat: selected.lat, lng: selected.lng }),
                              locale,
                            )}
                      </span>
                    ) : null}
                    <span className="rounded-md bg-giu-bg px-2 py-0.5 text-giu-muted">
                      {sortedSelectedBoxes.length} {t(locale, "impactBoxes")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="giu-btn-3d giu-tap rounded-full bg-giu-bg px-2.5 py-1 text-[12px] font-bold text-giu-muted"
                >
                  ✕
                </button>
              </div>

              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {sortedSelectedBoxes.map((box) => (
                  <li key={box.id}>
                    <GiuCustomerNavLink
                      href={href(GIU_ROUTES.customer.box(box.id))}
                      className="giu-btn-3d giu-tap flex items-center gap-3 rounded-2xl bg-giu-bg/80 px-3 py-2.5"
                    >
                      {box.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={box.imageUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-lg">
                          {GIu_CATEGORIES.find((c) => c.id === box.category)?.emoji ?? "🍱"}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-bold text-giu-ink">{box.title}</p>
                          {isLowStock(box.quantityLeft, box.quantityTotal) ? (
                            <span className="shrink-0 rounded bg-giu-gold px-1.5 py-0.5 text-[9px] font-bold text-giu-ink">
                              {t(locale, "qtyUrgent")}
                            </span>
                          ) : null}
                          <span className="shrink-0 rounded bg-giu-ink/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            {t(locale, "dealBadge")}
                          </span>
                          <span className="giu-badge-sale shrink-0">
                            {formatDiscount(box.originalPriceVnd, box.salePriceVnd)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-giu-muted">
                          {isClosingSoon(box.pickupEnd) ? (
                            <span className="mr-1 font-bold text-giu-primary">
                              {t(locale, "pickupSoon")} ·{" "}
                            </span>
                          ) : null}
                          {formatPickupDate(box.pickupStart)} ·{" "}
                          {formatPickupWindow(box.pickupStart, box.pickupEnd)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-[10px] bg-giu-gold px-2.5 py-1 text-[13px] font-extrabold leading-none text-giu-ink shadow-[0_2px_8px_rgba(249,168,37,0.25)]">
                          {box.quantityLeft}
                          {t(locale, "qtyLeftBold")}
                        </span>
                        <p className="text-[14px] font-extrabold text-giu-ink">
                          {formatVnd(box.salePriceVnd)}
                        </p>
                      </div>
                    </GiuCustomerNavLink>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                <GiuCustomerNavLink
                  href={href(GIU_ROUTES.customer.merchant(selected.merchant.id))}
                  className="giu-btn-secondary giu-btn-3d flex-1 !w-auto !py-3 text-center text-[13px]"
                >
                  {t(locale, "storeProfile")}
                </GiuCustomerNavLink>
                <button
                  type="button"
                  onClick={openDirections}
                  disabled={navBusy || locating}
                  className="giu-btn-secondary giu-btn-3d flex-1 !w-auto !py-3 text-[13px]"
                >
                  {navBusy || locating ? t(locale, "directionsLocating") : t(locale, "directionsInApp")}
                </button>
                {sortedSelectedBoxes[0] ? (
                  <GiuCustomerNavLink
                    href={href(GIU_ROUTES.customer.box(sortedSelectedBoxes[0].id))}
                    className="giu-btn-primary giu-btn-3d flex-1 !w-auto !py-3 text-[13px]"
                  >
                    {t(locale, "rescueNow")}
                  </GiuCustomerNavLink>
                ) : null}
              </div>

              {navOpen ? (
                <div className="overflow-hidden rounded-[16px] ring-1 ring-giu-border">
                  {userPos && route ? (
                    <GiuRouteMapInner
                      userPos={userPos}
                      destination={{ lat: selected.lat, lng: selected.lng }}
                      route={route}
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-giu-bg text-[12px] font-semibold text-giu-muted">
                      {navBusy ? t(locale, "directionsLocating") : t(locale, "directionsRouteFail")}
                    </div>
                  )}
                  <div className="space-y-0.5 bg-white px-3 py-2.5 text-center">
                    {route ? (
                      <p className="text-[13px] font-bold text-giu-ink">
                        {formatRouteDistance(route.distanceMeters)} ·{" "}
                        {formatOsrmDuration(route.durationSeconds, locale)}
                      </p>
                    ) : null}
                    <p className="text-[11px] font-semibold text-giu-muted">
                      {navError || t(locale, "directionsInAppHint")}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="absolute inset-x-0 bottom-4 z-[500] px-3">
          <div className="mx-auto max-w-[480px] space-y-3 rounded-2xl bg-white px-4 py-3 shadow-giu-md md:max-w-xl">
            <div className="text-center text-[13px]">
              <p className="font-bold text-giu-ink">{t(locale, "emptyBoxes")}</p>
              <p className="mt-1 text-giu-muted">{t(locale, "emptyBoxesHint")}</p>
            </div>
            <WaitlistForm />
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 z-[500] pb-2">
          <div className="flex gap-2.5 overflow-x-auto px-3 pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nearbyCards.map(({ pin, dist, best }) => (
              <button
                key={pin.merchant.id}
                type="button"
                onClick={() => {
                  setSelectedId(pin.merchant.id);
                  setFollowUser(false);
                  setFlyTarget({ lat: pin.lat, lng: pin.lng, zoom: 16 });
                }}
                className="giu-btn-3d giu-tap w-[min(72vw,280px)] shrink-0 rounded-2xl bg-white p-3 text-left shadow-[0_8px_28px_rgba(31,42,51,0.12)] ring-1 ring-black/[0.04]"
              >
                <div className="flex items-start gap-2.5">
                  {best?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={best.imageUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-giu-bg text-xl">
                      {GIu_CATEGORIES.find((c) => c.id === best?.category)?.emoji ?? "🍱"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-extrabold text-giu-ink">
                      {pin.merchant.name}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-giu-muted">
                      {formatDistance(dist, locale)} · {pin.boxes.length}{" "}
                      딜
                    </p>
                    {best ? (
                      <p className="mt-1 truncate text-[12px] font-bold text-giu-ink">
                        <span className="text-giu-primary">{formatVnd(best.salePriceVnd)}</span>
                        <span className="ml-1 font-semibold text-giu-muted">· {best.title}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
