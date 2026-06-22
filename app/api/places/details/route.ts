import { NextResponse } from "next/server";
import { fetchPlaceDetails, placesAutocompleteServerEnabled } from "@/lib/address/places-server";

export async function GET(request: Request) {
  const placeId = new URL(request.url).searchParams.get("placeId")?.trim() ?? "";
  if (!placeId) {
    return NextResponse.json({ error: "placeId required" }, { status: 400 });
  }

  if (!placesAutocompleteServerEnabled()) {
    return NextResponse.json({ error: "Places not configured" }, { status: 503 });
  }

  try {
    const details = await fetchPlaceDetails(placeId);
    if (!details) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }
    return NextResponse.json(details);
  } catch (e) {
    console.error("[places/details]", e);
    return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
  }
}
