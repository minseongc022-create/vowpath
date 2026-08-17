"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng, RouteResult } from "@/giu/lib/routing";

type Props = {
  userPos: LatLng;
  destination: LatLng;
  route: RouteResult;
};

function FitRouteBounds({
  userPos,
  destination,
  route,
}: {
  userPos: LatLng;
  destination: LatLng;
  route: RouteResult;
}) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(route.latLngs);
    bounds.extend([userPos.lat, userPos.lng]);
    bounds.extend([destination.lat, destination.lng]);
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  }, [map, userPos, destination, route]);
  return null;
}

export default function GiuRouteMapInner({ userPos, destination, route }: Props) {
  return (
    <MapContainer
      center={[destination.lat, destination.lng]}
      zoom={14}
      className="h-44 w-full"
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
        attribution="&copy; OSM &copy; CARTO"
      />
      <FitRouteBounds userPos={userPos} destination={destination} route={route} />
      <Polyline
        positions={route.latLngs}
        pathOptions={{ color: "#f9a825", weight: 5, opacity: 0.9 }}
      />
      <CircleMarker
        center={[userPos.lat, userPos.lng]}
        radius={7}
        pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#3182f6", fillOpacity: 1 }}
      />
      <CircleMarker
        center={[destination.lat, destination.lng]}
        radius={8}
        pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#3c2a21", fillOpacity: 1 }}
      />
    </MapContainer>
  );
}
