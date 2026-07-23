import { NextResponse } from "next/server";
import { exchangeJobberCode } from "@/lib/jobber-oauth";
import { fetchJobberAccount } from "@/lib/jobber-api";
import { saveJobberTokens } from "@/lib/jobber-tokens";
import { consumeJobberOAuthState } from "@/lib/jobber-oauth-state";
import { saveShopProfile } from "@/lib/shop-profile-db";
import { ROUTES } from "@/lib/constants";
import { getSession } from "@/lib/session";

function settingsRedirect(request: Request, params: Record<string, string>) {
  const settings = new URL(ROUTES.settings, request.url);
  // Prefer apex settings URL in production so the shop lands on the same host as OAuth.
  if (process.env.NODE_ENV === "production") {
    try {
      const host = new URL(request.url).hostname.toLowerCase();
      if (host === "www.effiroad.com" || host === "effiroad.com") {
        settings.protocol = "https:";
        settings.host = "effiroad.com";
      }
    } catch {
      /* keep request-relative */
    }
  }
  for (const [k, v] of Object.entries(params)) {
    settings.searchParams.set(k, v);
  }
  return NextResponse.redirect(settings);
}

export async function GET(request: Request) {
  const session = await getSession();
  const url = new URL(request.url);

  const error = url.searchParams.get("error");
  if (error) {
    if (!session) {
      return NextResponse.redirect(new URL(ROUTES.login, request.url));
    }
    return settingsRedirect(request, {
      jobber_error: error,
      section: "jobber",
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const pending = await consumeJobberOAuthState(state);

  if (!code || !state || !pending?.redirectUri) {
    if (!session) {
      return NextResponse.redirect(new URL(ROUTES.login, request.url));
    }
    return settingsRedirect(request, {
      jobber_error: "invalid_state",
      section: "jobber",
    });
  }

  // Prefer session user; fall back to KV-stored userId when www→apex dropped the cookie.
  const userId = session?.sub || pending.userId;
  if (!userId) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url));
  }

  if (session?.sub && pending.userId && session.sub !== pending.userId) {
    return settingsRedirect(request, {
      jobber_error: "invalid_state",
      section: "jobber",
    });
  }

  try {
    const tokens = await exchangeJobberCode(code, pending.redirectUri);
    await saveJobberTokens({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      updatedAt: new Date().toISOString(),
    });

    // One-tap done: no extra "Confirm" click in Settings.
    try {
      await saveShopProfile(userId, {
        jobberConnected: true,
        jobberSetupConfirmed: true,
        jobberSkipped: false,
      });
    } catch (e) {
      console.warn("[jobber/callback] shop profile confirm", e);
    }

    try {
      await fetchJobberAccount(userId);
    } catch (e) {
      console.warn("[jobber/callback] account fetch", e);
    }

    void import("@/lib/revenue-sync")
      .then(({ syncRevenueLedgerForUser }) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 90);
        return syncRevenueLedgerForUser(userId, start, end, { force: true });
      })
      .catch((e) => console.warn("[jobber/callback] revenue sync", e));

    if (!session) {
      const login = new URL(ROUTES.login, "https://effiroad.com");
      login.searchParams.set("next", `${ROUTES.settings}?jobber=connected&section=jobber`);
      return NextResponse.redirect(login);
    }

    return settingsRedirect(request, {
      jobber: "connected",
      section: "jobber",
    });
  } catch (e) {
    console.error("[jobber/callback]", e);
    if (!session) {
      return NextResponse.redirect(new URL(ROUTES.login, request.url));
    }
    return settingsRedirect(request, {
      jobber_error: "exchange_failed",
      section: "jobber",
    });
  }
}
