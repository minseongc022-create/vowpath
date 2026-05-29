import { NextResponse } from "next/server";
import { buildJobberAuthorizeUrl } from "@/lib/jobber-oauth";
import { isJobberConfigured } from "@/lib/jobber-config";
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
      new URL(`${ROUTES.dashboard}?jobber_error=not_configured`, request.url),
    );
  }

  const state = crypto.randomUUID();
  await clearJobberOAuthState();
  await setJobberOAuthState(state);

  return NextResponse.redirect(buildJobberAuthorizeUrl(state));
}
