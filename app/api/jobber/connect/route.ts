import { NextResponse } from "next/server";
import { buildJobberAuthorizeUrl } from "@/lib/jobber-oauth";
import {
  getJobberOriginFromRequest,
  getJobberRedirectUri,
  getJobberClientId,
  isJobberConfigured,
  JOBBER_PRODUCTION_CALLBACK_URI,
} from "@/lib/jobber-config";
import {
  clearJobberOAuthState,
  setJobberOAuthState,
} from "@/lib/jobber-oauth-state";
import { ROUTES } from "@/lib/constants";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url));
  }

  if (!isJobberConfigured()) {
    return NextResponse.redirect(
      new URL(`${ROUTES.settings}?jobber_error=not_configured&section=jobber`, request.url),
    );
  }

  // Keep the shop on apex before Jobber round-trip so session cookies stay aligned
  // with the canonical callback host (https://effiroad.com/...).
  const url = new URL(request.url);
  if (
    process.env.NODE_ENV === "production" &&
    url.hostname.toLowerCase() === "www.effiroad.com"
  ) {
    const apex = new URL(JOBBER_PRODUCTION_CALLBACK_URI);
    return NextResponse.redirect(`https://${apex.hostname}/api/jobber/connect`);
  }

  const redirectUri = getJobberRedirectUri(getJobberOriginFromRequest(request));
  if (!redirectUri) {
    return NextResponse.redirect(
      new URL(`${ROUTES.settings}?jobber_error=redirect_missing&section=jobber`, request.url),
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    /localhost|127\.0\.0\.1/i.test(redirectUri)
  ) {
    return NextResponse.redirect(
      new URL(`${ROUTES.settings}?jobber_error=redirect_localhost&section=jobber`, request.url),
    );
  }

  console.info(
    "[jobber/connect] redirect_uri",
    JSON.stringify(redirectUri),
    "client_id",
    JSON.stringify(getJobberClientId()),
    "user",
    session.sub,
  );

  const state = crypto.randomUUID();
  await clearJobberOAuthState();
  await setJobberOAuthState(state, redirectUri, session.sub);

  return NextResponse.redirect(buildJobberAuthorizeUrl(state, redirectUri));
}
