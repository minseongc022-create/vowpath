"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TrackSnapshot = {
  status: string;
  shopName: string;
  techName: string;
  customerName: string;
  etaMinutes: number | null;
};

export function TechGoView({ token }: { token: string }) {
  const [track, setTrack] = useState<TrackSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [eta, setEta] = useState(30);
  const watchId = useRef<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/track/tech/${encodeURIComponent(token)}`);
    const data = (await res.json()) as { ok?: boolean; track?: TrackSnapshot; error?: string };
    if (!res.ok || !data.track) {
      setError(data.error ?? "Link expired.");
      return;
    }
    setTrack(data.track);
    if (data.track.etaMinutes) setEta(data.track.etaMinutes);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (watchId.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  async function ping(lat: number, lng: number, heading?: number | null, speed?: number | null) {
    await fetch(`/api/track/tech/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ping",
        lat,
        lng,
        heading: heading ?? null,
        speedMps: speed ?? null,
        etaMinutes: eta,
      }),
    });
  }

  function startSharing() {
    setError(null);
    if (!navigator.geolocation) {
      setError("This phone can't share GPS. Use a modern mobile browser.");
      return;
    }
    setSharing(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        void ping(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.heading,
          pos.coords.speed,
        );
      },
      () => {
        setError("Location permission denied. Allow location, then tap Start again.");
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
  }

  function stopSharing() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
  }

  async function markArrived() {
    stopSharing();
    await fetch(`/api/track/tech/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "arrive" }),
    });
    await load();
  }

  async function endTrack() {
    stopSharing();
    await fetch(`/api/track/tech/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });
    await load();
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-stone-50 px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        {track?.shopName ?? "Effiroad"}
      </p>
      <h1 className="mt-2 text-2xl font-bold text-stone-900">Share live location</h1>
      <p className="mt-2 text-sm text-stone-600">
        Customer: <strong>{track?.customerName ?? "…"}</strong>
      </p>
      <p className="mt-1 text-sm text-stone-600">
        Keep this page open while driving. The customer sees your car on a free map link — no app
        install.
      </p>

      <label className="mt-6 block text-sm font-medium text-stone-800">
        ETA (minutes)
        <select
          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base"
          value={eta}
          onChange={(e) => setEta(Number(e.target.value))}
          disabled={sharing}
        >
          {[5, 10, 15, 20, 30, 45, 60].map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </select>
      </label>

      <div className="mt-6 space-y-3">
        {!sharing ? (
          <button
            type="button"
            onClick={startSharing}
            className="w-full rounded-2xl bg-brand-800 py-4 text-lg font-bold text-white"
          >
            Start — share my location
          </button>
        ) : (
          <button
            type="button"
            onClick={stopSharing}
            className="w-full rounded-2xl border border-amber-400 bg-amber-50 py-4 text-lg font-bold text-amber-950"
          >
            Sharing… tap to pause
          </button>
        )}
        <button
          type="button"
          onClick={() => void markArrived()}
          className="w-full rounded-2xl border border-emerald-300 bg-emerald-50 py-3 text-base font-semibold text-emerald-900"
        >
          I arrived
        </button>
        <button
          type="button"
          onClick={() => void endTrack()}
          className="w-full py-2 text-sm text-stone-500"
        >
          End tracking
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <p className="mt-8 text-center text-[11px] text-stone-500">
        Uses your phone GPS in the browser. No Google Maps fees. Allow location when prompted.
      </p>
    </div>
  );
}
