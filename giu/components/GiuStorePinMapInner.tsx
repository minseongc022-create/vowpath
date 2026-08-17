"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  lat: number;
  lng: number;
};

export default function GiuStorePinMapInner({ lat, lng }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      dragging={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
        attribution="&copy; OSM &copy; CARTO"
      />
      <CircleMarker
        center={[lat, lng]}
        radius={9}
        pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#3c2a21", fillOpacity: 1 }}
      />
    </MapContainer>
  );
}
