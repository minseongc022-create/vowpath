import { NextResponse } from "next/server";
import {
  getJobberClientId,
  getJobberRedirectUri,
  isJobberConfigured,
} from "@/lib/jobber-config";

/** Public OAuth app metadata (client id is not secret). For ops / settings verification. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const redirectUri = getJobberRedirectUri(origin);
  const clientId = getJobberClientId();

  return NextResponse.json({
    configured: isJobberConfigured(),
    redirectUri: redirectUri || null,
    clientId: clientId || null,
  });
}
