"use client";

import dynamic from "next/dynamic";

const GiuStorePinMapInner = dynamic(() => import("@/giu/components/GiuStorePinMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-36 items-center justify-center bg-giu-bg text-[12px] text-giu-muted">…</div>
  ),
});

type Props = {
  lat: number;
  lng: number;
  compact?: boolean;
};

export function GiuStorePinMap({ lat, lng, compact = false }: Props) {
  return (
    <div className={`overflow-hidden ${compact ? "h-36" : "h-48"}`}>
      <GiuStorePinMapInner lat={lat} lng={lng} />
    </div>
  );
}
