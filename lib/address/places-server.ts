/** Server-side Google Places autocomplete + details (reliable on mobile). */

export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

function googleMapsServerKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ||
    null
  );
}

export function placesAutocompleteServerEnabled(): boolean {
  return Boolean(googleMapsServerKey());
}

export async function fetchPlacePredictions(input: string): Promise<PlacePrediction[]> {
  const key = googleMapsServerKey();
  const trimmed = input.trim();
  if (!key || trimmed.length < 1) return [];

  const params = new URLSearchParams({
    input: trimmed,
    key,
    components: "country:us",
    language: "en",
  });

  async function requestWithTypes(types?: string): Promise<PlacePrediction[]> {
    const p = new URLSearchParams(params);
    if (types) p.set("types", types);
    else p.delete("types");

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${p.toString()}`,
      { signal: AbortSignal.timeout(8_000) },
    );

    if (!res.ok) {
      console.warn("[places-server] autocomplete HTTP", res.status);
      return [];
    }

    const data = (await res.json()) as {
      status?: string;
      predictions?: Array<{
        place_id?: string;
        description?: string;
        structured_formatting?: {
          main_text?: string;
          secondary_text?: string;
        };
      }>;
      error_message?: string;
    };

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.warn("[places-server] autocomplete", data.status, data.error_message);
      return [];
    }

    return (data.predictions ?? [])
      .filter((pred) => pred.place_id && pred.description)
      .slice(0, 8)
      .map((pred) => ({
        placeId: pred.place_id!,
        description: pred.description!.trim(),
        mainText: pred.structured_formatting?.main_text?.trim() || pred.description!.trim(),
        secondaryText: pred.structured_formatting?.secondary_text?.trim() || "",
      }));
  }

  let results = await requestWithTypes("address");
  if (results.length === 0 && trimmed.length >= 2) {
    results = await requestWithTypes(undefined);
  }
  return results;
}

export async function fetchPlaceDetails(
  placeId: string,
): Promise<{ formattedAddress: string; placeId: string } | null> {
  const key = googleMapsServerKey();
  if (!key || !placeId.trim()) return null;

  const params = new URLSearchParams({
    place_id: placeId.trim(),
    key,
    fields: "formatted_address,place_id",
    language: "en",
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
    { signal: AbortSignal.timeout(8_000) },
  );

  if (!res.ok) return null;

  const data = (await res.json()) as {
    status?: string;
    result?: { formatted_address?: string; place_id?: string };
  };

  if (data.status !== "OK" || !data.result?.formatted_address) return null;

  return {
    formattedAddress: data.result.formatted_address.trim(),
    placeId: data.result.place_id ?? placeId,
  };
}
