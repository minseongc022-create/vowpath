"use client";

import { ensureGoogleMapsPlacesLoaded, googlePlacesEnabled } from "./google-maps-loader";
import type { PlacePrediction } from "./places-server";

function placesApi() {
  return window.google?.maps?.places;
}

function mapPredictions(predictions: GoogleAutocompletePrediction[]): PlacePrediction[] {
  return predictions.slice(0, 8).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? "",
  }));
}

export async function fetchClientPlacePredictions(input: string): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (!trimmed || !googlePlacesEnabled()) return [];

  await ensureGoogleMapsPlacesLoaded();
  const places = placesApi();
  if (!places?.AutocompleteService) return [];

  const service = new places.AutocompleteService();
  const ok = places.PlacesServiceStatus?.OK ?? "OK";

  const request = (types?: string[]): Promise<PlacePrediction[]> =>
    new Promise((resolve) => {
      service.getPlacePredictions(
        {
          input: trimmed,
          componentRestrictions: { country: "us" },
          ...(types ? { types } : {}),
        },
        (predictions, status) => {
          if (status === ok && predictions?.length) {
            resolve(mapPredictions(predictions));
            return;
          }
          resolve([]);
        },
      );
    });

  const primary = await request(["address"]);
  if (primary.length > 0) return primary;
  return request(undefined);
}

export async function fetchClientPlaceDetails(
  placeId: string,
): Promise<{ formattedAddress: string; placeId: string } | null> {
  if (!placeId.trim() || !googlePlacesEnabled()) return null;

  await ensureGoogleMapsPlacesLoaded();
  const places = placesApi();
  if (!places?.PlacesService) return null;

  const container = document.createElement("div");
  const service = new places.PlacesService(container);
  const ok = places.PlacesServiceStatus?.OK ?? "OK";

  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId: placeId.trim(),
        fields: ["formatted_address", "place_id"],
      },
      (place, status) => {
        if (status !== ok || !place?.formatted_address) {
          resolve(null);
          return;
        }
        resolve({
          formattedAddress: place.formatted_address,
          placeId: place.place_id ?? placeId,
        });
      },
    );
  });
}
