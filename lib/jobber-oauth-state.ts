import { cookies } from "next/headers";

export const JOBBER_OAUTH_STATE_COOKIE = "jobber_oauth_state";

export async function setJobberOAuthState(state: string) {
  const jar = await cookies();
  jar.set(JOBBER_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function readJobberOAuthState(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(JOBBER_OAUTH_STATE_COOKIE)?.value;
}

export async function clearJobberOAuthState() {
  const jar = await cookies();
  jar.delete(JOBBER_OAUTH_STATE_COOKIE);
}
