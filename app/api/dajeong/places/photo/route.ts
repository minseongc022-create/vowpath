import { NextResponse } from "next/server";

function apiKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY?.trim()
    || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
    || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim()
    || null;
}

function referers(): string[] {
  return [...new Set([
    process.env.GOOGLE_MAPS_HTTP_REFERER?.trim(),
    process.env.TWILIO_WEBHOOK_BASE_URL?.trim(),
    "https://effiroad.com/",
    "https://www.effiroad.com/",
  ].filter((value): value is string => Boolean(value)).map((value) => value.endsWith("/") ? value : `${value}/`))];
}

export async function GET(request: Request) {
  const key = apiKey();
  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  const ref = url.searchParams.get("ref")?.trim() ?? "";
  if (!key || !ref || ref.length > 1500 || !["new", "legacy"].includes(source ?? "")) {
    return NextResponse.json({ error: "사진을 찾지 못했어." }, { status: 404 });
  }
  if (source === "new" && !/^places\/[^/]+\/photos\/[^/]+$/.test(ref)) {
    return NextResponse.json({ error: "잘못된 사진 경로야." }, { status: 400 });
  }
  const target = source === "new"
    ? `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=1200&key=${encodeURIComponent(key)}`
    : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${encodeURIComponent(ref)}&key=${encodeURIComponent(key)}`;
  try {
    for (const referer of referers()) {
      const response = await fetch(target, {
        redirect: "follow",
        headers: { Referer: referer, Origin: referer.replace(/\/$/, "") },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) continue;
      return new NextResponse(await response.arrayBuffer(), {
        headers: {
          "Content-Type": response.headers.get("content-type") || "image/jpeg",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }
    return NextResponse.json({ error: "사진을 불러오지 못했어." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "사진을 불러오지 못했어." }, { status: 404 });
  }
}
