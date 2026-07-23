import { NextResponse } from "next/server";
import { buildJobberAuthorizeUrl } from "@/lib/jobber-oauth";
import {
  getJobberOriginFromRequest,
  getJobberRedirectUri,
  getJobberClientId,
  isJobberConfigured,
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

  // Log exact bytes so trailing-space mismatches are visible in Vercel logs.
  console.info(
    "[jobber/connect] redirect_uri",
    JSON.stringify(redirectUri),
    "client_id",
    JSON.stringify(getJobberClientId()),
  );

  const state = crypto.randomUUID();
  await clearJobberOAuthState();
  await setJobberOAuthState(state, redirectUri);

  return NextResponse.redirect(buildJobberAuthorizeUrl(state, redirectUri));
}
