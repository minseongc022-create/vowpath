"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/giu/lib/map-pins";

const MapDiscover = dynamic(() => import("./MapDiscover").then((m) => m.MapDiscover), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[50vh] items-center justify-center bg-giu-bg text-sm text-giu-muted">
      지도 불러오는 중…
    </div>
  ),
});

export function MapDiscoverClient({ pins }: { pins: MapPin[] }) {
  return <MapDiscover pins={pins} />;
}
