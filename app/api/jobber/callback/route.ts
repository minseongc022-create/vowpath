import { NextResponse } from "next/server";
import { exchangeJobberCode } from "@/lib/jobber-oauth";
import { fetchJobberAccount } from "@/lib/jobber-api";
import { saveJobberTokens } from "@/lib/jobber-tokens";
import {
  clearJobberOAuthState,
  readJobberOAuthRedirectUri,
  readJobberOAuthState,
} from "@/lib/jobber-oauth-state";
import { ROUTES } from "@/lib/constants";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  const url = new URL(request.url);
  const settings = new URL(ROUTES.settings, request.url);

  if (!session) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url));
  }

  const error = url.searchParams.get("error");
  if (error) {
    settings.searchParams.set("jobber_error", error);
    settings.searchParams.set("section", "jobber");
    return NextResponse.redirect(settings);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = await readJobberOAuthState();
  const savedRedirectUri = await readJobberOAuthRedirectUri();
  await clearJobberOAuthState();

  if (!code || !state || !savedState || state !== savedState || !savedRedirectUri) {
    settings.searchParams.set("jobber_error", "invalid_state");
    settings.searchParams.set("section", "jobber");
    return NextResponse.redirect(settings);
  }

  try {
    const tokens = await exchangeJobberCode(code, savedRedirectUri);
    await saveJobberTokens({
      userId: session.sub,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      updatedAt: new Date().toISOString(),
    });

    try {
      await fetchJobberAccount(session.sub);
    } catch (e) {
      console.warn("[jobber/callback] account fetch", e);
    }

    settings.searchParams.set("jobber", "connected");
    settings.searchParams.set("section", "jobber");
    return NextResponse.redirect(settings);
  } catch (e) {
    console.error("[jobber/callback]", e);
    settings.searchParams.set("jobber_error", "exchange_failed");
    settings.searchParams.set("section", "jobber");
    return NextResponse.redirect(settings);
  }
}
