"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TrackSnapshot = {
  status: "waiting" | "en_route" | "arrived" | "ended";
  shopName: string;
  techName: string;
  etaMinutes: number | null;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  updatedAt: string;
};

type LeafletNs = {
  map: (el: HTMLElement, opts?: object) => {
    setView: (latlng: [number, number], zoom: number) => unknown;
    panTo: (latlng: [number, number], opts?: object) => unknown;
  };
  tileLayer: (url: string, opts?: object) => { addTo: (map: unknown) => unknown };
  marker: (
    latlng: [number, number],
    opts?: object,
  ) => {
    addTo: (map: unknown) => unknown;
    setLatLng: (latlng: [number, number]) => unknown;
    setIcon: (icon: unknown) => unknown;
  };
  divIcon: (opts: object) => unknown;
};

declare global {
  interface Window {
    L?: LeafletNs;
  }
}

function loadLeaflet(): Promise<LeafletNs> {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet failed"));
    };
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.body.appendChild(script);
  });
}

const STATUS_COPY: Record<TrackSnapshot["status"], string> = {
  waiting: "Tech will share location when they leave",
  en_route: "On the way",
  arrived: "Arrived",
  ended: "Visit complete",
};

export function CustomerTrackView({ token }: { token: string }) {
  const [track, setTrack] = useState<TrackSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<{
    map: ReturnType<LeafletNs["map"]>;
    marker: ReturnType<LeafletNs["marker"]>;
    L: LeafletNs;
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(token)}`);
      const data = (await res.json()) as { ok?: boolean; track?: TrackSnapshot; error?: string };
      if (!res.ok || !data.track) {
        setError(data.error ?? "Could not load tracking.");
        return;
      }
      setError(null);
      setTrack(data.track);
    } catch {
      setError("Connection issue — retrying…");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!track?.lat || !track?.lng || !mapRef.current) return;
    let cancelled = false;

    void (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapRef.current) return;
        const carHtml = `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));transform:rotate(${track.heading ?? 0}deg)">🚗</div>`;

        if (!mapObj.current) {
          const map = L.map(mapRef.current).setView([track.lat!, track.lng!], 15) as ReturnType<
            LeafletNs["map"]
          >;
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19,
          }).addTo(map);
          const icon = L.divIcon({
            className: "",
            html: carHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          const marker = L.marker([track.lat!, track.lng!], { icon }).addTo(map) as ReturnType<
            LeafletNs["marker"]
          >;
          mapObj.current = { map, marker, L };
        } else {
          const { map, marker, L: Leaf } = mapObj.current;
          marker.setLatLng([track.lat!, track.lng!]);
          marker.setIcon(
            Leaf.divIcon({
              className: "",
              html: carHtml,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            }),
          );
          map.panTo([track.lat!, track.lng!], { animate: true });
        }
      } catch {
        /* CDN optional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [track?.lat, track?.lng, track?.heading]);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          {track?.shopName ?? "Service visit"}
        </p>
        <h1 className="mt-1 text-xl font-bold text-stone-900">Live arrival</h1>
        <p className="mt-1 text-sm text-stone-600">
          {track ? STATUS_COPY[track.status] : "Loading…"}
          {track?.etaMinutes != null && track.status === "en_route"
            ? ` · ~${track.etaMinutes} min`
            : ""}
        </p>
        {track?.techName ? (
          <p className="mt-1 text-sm font-medium text-stone-800">{track.techName}</p>
        ) : null}
      </header>

      <div className="relative min-h-[55vh] flex-1 bg-stone-200">
        <div ref={mapRef} className="absolute inset-0 z-0" />
        {!track?.lat ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-100/90 px-6 text-center">
            <p className="text-sm text-stone-600">
              {track?.status === "arrived"
                ? "Your technician has arrived."
                : track?.status === "ended"
                  ? "This visit is complete. Tracking has ended."
                  : "Waiting for the technician to share their location…"}
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-center text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <p className="px-4 py-3 text-center text-[11px] text-stone-500">
        Map © OpenStreetMap · Updates every few seconds · Link expires after the visit
      </p>
    </div>
  );
}
