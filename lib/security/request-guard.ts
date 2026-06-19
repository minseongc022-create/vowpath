import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function requestOrigin(request: Request): string | null {
  return normalizeOrigin(request.headers.get("origin"));
}

function requestHostOrigin(request: Request): string | null {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  if (!host) return null;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return normalizeOrigin(`${proto}://${host}`);
}

function configuredOrigins(): Set<string> {
  const origins = new Set<string>();
  const envValues = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.TWILIO_WEBHOOK_BASE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];
  for (const value of envValues) {
    const origin = normalizeOrigin(value ?? null);
    if (origin) origins.add(origin);
  }
  return origins;
}

export function verifySameOriginRequest(request: Request): NextResponse | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;

  const origin = requestOrigin(request);
  if (!origin) {
    // Browser form/fetch CSRF sends Origin for unsafe methods. Allow missing
    // Origin in development for scripts and older local tooling.
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      : null;
  }

  const allowed = configuredOrigins();
  const hostOrigin = requestHostOrigin(request);
  if (hostOrigin) allowed.add(hostOrigin);
  allowed.add("http://localhost:3000");
  allowed.add("http://127.0.0.1:3000");

  if (!allowed.has(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
