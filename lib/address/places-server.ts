/** Server-side Google Places autocomplete + details (reliable on mobile). */

export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceLookupMeta = {
  googleStatus?: string;
  source?: "places_new" | "places_legacy" | "none";
  errorMessage?: string;
};

function googleMapsServerKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ||
    null
  );
}

/**
 * Many Vercel projects only have a browser key with HTTP-referrer restrictions.
 * Server fetches send an empty referer → Google returns REQUEST_DENIED /
 * PERMISSION_DENIED. Retry with production referers so the same key works.
 */
function googleMapsRefererCandidates(): string[] {
  const configured = process.env.GOOGLE_MAPS_HTTP_REFERER?.trim();
  const base = process.env.TWILIO_WEBHOOK_BASE_URL?.trim();
  const candidates = [
    configured,
    base,
    "https://effiroad.com/",
    "https://link.effiroad.com/",
    "https://www.effiroad.com/",
  ]
    .filter((v): v is string => Boolean(v))
    .map((v) => (v.endsWith("/") ? v : `${v}/`));
  return [...new Set(candidates)];
}

function googleMapsRequestHeaders(
  referer: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    Referer: referer,
    Origin: referer.replace(/\/$/, ""),
    ...(extra ?? {}),
  };
}

function isPermissionDenied(status?: string, message?: string): boolean {
  const s = (status || "").toUpperCase();
  const m = (message || "").toLowerCase();
  return (
    s === "REQUEST_DENIED" ||
    s === "PERMISSION_DENIED" ||
    m.includes("referer") ||
    m.includes("blocked")
  );
}

export function placesAutocompleteServerEnabled(): boolean {
  return Boolean(googleMapsServerKey());
}

function normalizePlaceId(raw: string): string {
  const id = raw.trim();
  return id.startsWith("places/") ? id.slice("places/".length) : id;
}

async function fetchPredictionsPlacesNewOnce(
  key: string,
  input: string,
  referer: string,
): Promise<{ predictions: PlacePrediction[]; status: string; errorMessage?: string }> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: googleMapsRequestHeaders(referer, {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
    }),
    body: JSON.stringify({
      input,
      includedRegionCodes: ["us"],
      languageCode: "en",
      includeQueryPredictions: false,
    }),
    signal: AbortSignal.timeout(8_000),
  });

  const data = (await res.json().catch(() => ({}))) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        place?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
    error?: { status?: string; message?: string; code?: number };
  };

  if (!res.ok) {
    const status = data.error?.status || `HTTP_${res.status}`;
    const errorMessage = data.error?.message;
    console.warn("[places-server] autocomplete(new)", status, errorMessage, referer);
    return { predictions: [], status, errorMessage };
  }

  const predictions = (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId || p?.place))
    .map((p) => {
      const placeId = normalizePlaceId(p.placeId || p.place || "");
      const description = (p.text?.text || "").trim();
      const mainText = (p.structuredFormat?.mainText?.text || description).trim();
      const secondaryText = (p.structuredFormat?.secondaryText?.text || "").trim();
      return { placeId, description, mainText, secondaryText };
    })
    .filter((p) => p.placeId && p.description)
    .slice(0, 8);

  return {
    predictions,
    status: predictions.length > 0 ? "OK" : "ZERO_RESULTS",
  };
}

async function fetchPredictionsPlacesNew(
  key: string,
  input: string,
): Promise<{ predictions: PlacePrediction[]; status: string; errorMessage?: string }> {
  let last = { predictions: [] as PlacePrediction[], status: "UNKNOWN", errorMessage: undefined as string | undefined };
  for (const referer of googleMapsRefererCandidates()) {
    last = await fetchPredictionsPlacesNewOnce(key, input, referer);
    if (last.predictions.length > 0) return last;
    if (!isPermissionDenied(last.status, last.errorMessage)) return last;
  }
  return last;
}

async function fetchPredictionsLegacyOnce(
  key: string,
  input: string,
  referer: string,
  types?: string,
): Promise<{ predictions: PlacePrediction[]; status: string; errorMessage?: string }> {
  const params = new URLSearchParams({
    input,
    key,
    components: "country:us",
    language: "en",
  });
  if (types) params.set("types", types);

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
    {
      headers: googleMapsRequestHeaders(referer),
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (!res.ok) {
    console.warn("[places-server] autocomplete HTTP", res.status);
    return { predictions: [], status: `HTTP_${res.status}` };
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
    console.warn("[places-server] autocomplete", data.status, data.error_message, referer);
    return {
      predictions: [],
      status: data.status || "UNKNOWN",
      errorMessage: data.error_message,
    };
  }

  const predictions = (data.predictions ?? [])
    .filter((pred) => pred.place_id && pred.description)
    .slice(0, 8)
    .map((pred) => ({
      placeId: pred.place_id!,
      description: pred.description!.trim(),
      mainText: pred.structured_formatting?.main_text?.trim() || pred.description!.trim(),
      secondaryText: pred.structured_formatting?.secondary_text?.trim() || "",
    }));

  return {
    predictions,
    status: data.status || (predictions.length ? "OK" : "ZERO_RESULTS"),
    errorMessage: data.error_message,
  };
}

async function fetchPredictionsLegacy(
  key: string,
  input: string,
): Promise<{ predictions: PlacePrediction[]; status: string; errorMessage?: string }> {
  let last = { predictions: [] as PlacePrediction[], status: "UNKNOWN", errorMessage: undefined as string | undefined };

  for (const referer of googleMapsRefererCandidates()) {
    last = await fetchPredictionsLegacyOnce(key, input, referer, "address");
    if (last.predictions.length > 0) return last;

    if (last.status === "ZERO_RESULTS" && input.length >= 2) {
      last = await fetchPredictionsLegacyOnce(key, input, referer, undefined);
      if (last.predictions.length > 0) return last;
    }

    if (!isPermissionDenied(last.status, last.errorMessage)) return last;
  }

  return last;
}

export async function fetchPlacePredictions(
  input: string,
): Promise<{ predictions: PlacePrediction[]; meta: PlaceLookupMeta }> {
  const key = googleMapsServerKey();
  const trimmed = input.trim();
  if (!key || trimmed.length < 1) {
    return { predictions: [], meta: { source: "none", googleStatus: "NO_KEY" } };
  }

  const neu = await fetchPredictionsPlacesNew(key, trimmed);
  if (neu.predictions.length > 0) {
    return {
      predictions: neu.predictions,
      meta: { source: "places_new", googleStatus: neu.status },
    };
  }

  const legacy = await fetchPredictionsLegacy(key, trimmed);
  if (legacy.predictions.length > 0) {
    return {
      predictions: legacy.predictions,
      meta: { source: "places_legacy", googleStatus: legacy.status },
    };
  }

  const googleStatus = neu.status !== "ZERO_RESULTS" ? neu.status : legacy.status;
  const errorMessage = neu.errorMessage || legacy.errorMessage;
  return {
    predictions: [],
    meta: {
      source: neu.status === "OK" || neu.status === "ZERO_RESULTS" ? "places_new" : "places_legacy",
      googleStatus,
      errorMessage,
    },
  };
}

export async function fetchPlaceDetails(
  placeId: string,
): Promise<{ formattedAddress: string; placeId: string } | null> {
  const key = googleMapsServerKey();
  const id = normalizePlaceId(placeId);
  if (!key || !id) return null;

  for (const referer of googleMapsRefererCandidates()) {
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
        headers: googleMapsRequestHeaders(referer, {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "id,formattedAddress",
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string; formattedAddress?: string };
        if (data.formattedAddress) {
          return {
            formattedAddress: data.formattedAddress.trim(),
            placeId: normalizePlaceId(data.id || id),
          };
        }
      } else {
        const err = (await res.json().catch(() => ({}))) as {
          error?: { status?: string; message?: string };
        };
        if (!isPermissionDenied(err.error?.status, err.error?.message)) {
          console.warn("[places-server] details(new)", err.error?.status, err.error?.message);
          break;
        }
      }
    } catch (e) {
      console.warn("[places-server] details(new) failed", e);
      break;
    }
  }

  for (const referer of googleMapsRefererCandidates()) {
    const params = new URLSearchParams({
      place_id: id,
      key,
      fields: "formatted_address,place_id",
      language: "en",
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
      {
        headers: googleMapsRequestHeaders(referer),
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) continue;

    const data = (await res.json()) as {
      status?: string;
      result?: { formatted_address?: string; place_id?: string };
      error_message?: string;
    };

    if (data.status === "OK" && data.result?.formatted_address) {
      return {
        formattedAddress: data.result.formatted_address.trim(),
        placeId: data.result.place_id ?? id,
      };
    }

    if (!isPermissionDenied(data.status, data.error_message)) {
      if (data.status && data.status !== "OK") {
        console.warn("[places-server] details", data.status, data.error_message);
      }
      break;
    }
  }

  return null;
}
