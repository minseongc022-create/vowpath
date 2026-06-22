import { NextResponse } from "next/server";
import {
  fetchPlacePredictions,
  placesAutocompleteServerEnabled,
} from "@/lib/address/places-server";

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("input")?.trim() ?? "";
  if (input.length < 1) {
    return NextResponse.json({ predictions: [], enabled: placesAutocompleteServerEnabled() });
  }

  if (!placesAutocompleteServerEnabled()) {
    return NextResponse.json({ predictions: [], enabled: false });
  }

  try {
    const predictions = await fetchPlacePredictions(input);
    return NextResponse.json({ predictions, enabled: true });
  } catch (e) {
    console.error("[places/autocomplete]", e);
    return NextResponse.json({ predictions: [], enabled: true, error: "lookup_failed" }, { status: 502 });
  }
}
