import { cookies } from "next/headers";

export const JOBBER_OAUTH_STATE_COOKIE = "jobber_oauth_state";
export const JOBBER_OAUTH_REDIRECT_COOKIE = "jobber_oauth_redirect";

export async function setJobberOAuthState(state: string, redirectUri: string) {
  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  jar.set(JOBBER_OAUTH_STATE_COOKIE, state, opts);
  jar.set(JOBBER_OAUTH_REDIRECT_COOKIE, redirectUri, opts);
}

export async function readJobberOAuthState(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(JOBBER_OAUTH_STATE_COOKIE)?.value;
}

export async function readJobberOAuthRedirectUri(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(JOBBER_OAUTH_REDIRECT_COOKIE)?.value;
}

export async function clearJobberOAuthState() {
  const jar = await cookies();
  jar.delete(JOBBER_OAUTH_STATE_COOKIE);
  jar.delete(JOBBER_OAUTH_REDIRECT_COOKIE);
}
