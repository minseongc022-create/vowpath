"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/giu/lib/map-pins";

const MapDiscover = dynamic(() => import("./MapDiscover").then((m) => m.MapDiscover), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[12rem] items-center justify-center bg-giu-bg text-sm text-giu-muted">
      Đang tải bản đồ…
    </div>
  ),
});

export function MapDiscoverClient({ pins }: { pins: MapPin[] }) {
  return <MapDiscover pins={pins} />;
}
