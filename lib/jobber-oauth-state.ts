import { cookies } from "next/headers";
import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";

export const JOBBER_OAUTH_STATE_COOKIE = "jobber_oauth_state";
export const JOBBER_OAUTH_REDIRECT_COOKIE = "jobber_oauth_redirect";

const OAUTH_TTL_SEC = 600;
const KV_PREFIX = "effiroad:jobber-oauth:";

export type JobberOAuthPending = {
  userId: string;
  redirectUri: string;
  createdAt: string;
};

function kvKey(state: string) {
  return `${KV_PREFIX}${state}`;
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: OAUTH_TTL_SEC,
  // Share across apex + www so Jobber's apex callback still sees the cookies.
  ...(process.env.NODE_ENV === "production" ? { domain: ".effiroad.com" } : {}),
};

async function setCookiePair(state: string, redirectUri: string) {
  const jar = await cookies();
  jar.set(JOBBER_OAUTH_STATE_COOKIE, state, cookieOpts);
  jar.set(JOBBER_OAUTH_REDIRECT_COOKIE, redirectUri, cookieOpts);
}

async function clearCookiePair() {
  const jar = await cookies();
  const clear = { ...cookieOpts, maxAge: 0 };
  jar.set(JOBBER_OAUTH_STATE_COOKIE, "", clear);
  jar.set(JOBBER_OAUTH_REDIRECT_COOKIE, "", clear);
}

/**
 * Persist OAuth CSRF state + redirect_uri (+ userId) in KV when available,
 * with host-shared cookies as a secondary path. Cookie-only flows break when
 * the shop starts on www and Jobber returns to apex.
 */
export async function setJobberOAuthState(
  state: string,
  redirectUri: string,
  userId: string,
) {
  const pending: JobberOAuthPending = {
    userId,
    redirectUri,
    createdAt: new Date().toISOString(),
  };

  if (useKvStore()) {
    try {
      await kv.set(kvKey(state), pending, { ex: OAUTH_TTL_SEC });
    } catch (e) {
      console.warn("[jobber-oauth-state] kv set failed; cookie fallback only", e);
    }
  }

  await setCookiePair(state, redirectUri);
}

export async function consumeJobberOAuthState(
  state: string | null | undefined,
): Promise<JobberOAuthPending | null> {
  if (!state) return null;

  let fromKv: JobberOAuthPending | null = null;
  if (useKvStore()) {
    try {
      fromKv = (await kv.get<JobberOAuthPending>(kvKey(state))) ?? null;
      if (fromKv) {
        await kv.del(kvKey(state)).catch(() => undefined);
      }
    } catch (e) {
      console.warn("[jobber-oauth-state] kv get failed", e);
    }
  }

  const jar = await cookies();
  const cookieState = jar.get(JOBBER_OAUTH_STATE_COOKIE)?.value;
  const cookieRedirect = jar.get(JOBBER_OAUTH_REDIRECT_COOKIE)?.value;
  await clearCookiePair();

  if (fromKv && fromKv.redirectUri) {
    return fromKv;
  }

  if (cookieState && cookieState === state && cookieRedirect) {
    // Cookie path has no userId — caller must require session.sub.
    return {
      userId: "",
      redirectUri: cookieRedirect,
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

/** @deprecated use setJobberOAuthState(state, redirectUri, userId) */
export async function readJobberOAuthState(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(JOBBER_OAUTH_STATE_COOKIE)?.value;
}

/** @deprecated use consumeJobberOAuthState */
export async function readJobberOAuthRedirectUri(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(JOBBER_OAUTH_REDIRECT_COOKIE)?.value;
}

export async function clearJobberOAuthState() {
  await clearCookiePair();
}
