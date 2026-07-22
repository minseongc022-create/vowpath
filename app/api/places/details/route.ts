import { NextResponse } from "next/server";
import { fetchPlaceDetails, placesAutocompleteServerEnabled } from "@/lib/address/places-server";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitKey,
} from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const ip = clientIpFromRequest(request);
  const rl = await checkRateLimit({
    key: rateLimitKey("places:details", ip),
    limit: 30,
    windowSeconds: 60,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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
