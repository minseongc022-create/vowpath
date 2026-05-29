import {
  getJobberRedirectUri,
  isJobberConfigured,
} from "./jobber-config";

const AUTHORIZE_URL = "https://api.getjobber.com/api/oauth/authorize";
const TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

export type JobberTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export function buildJobberAuthorizeUrl(state: string, redirectUri?: string): string {
  const clientId = process.env.JOBBER_CLIENT_ID!.trim();
  const uri = redirectUri || getJobberRedirectUri();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: uri,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeJobberCode(
  code: string,
  redirectUri?: string,
): Promise<JobberTokenResponse> {
  if (!isJobberConfigured()) {
    throw new Error("JOBBER_NOT_CONFIGURED");
  }

  const uri = redirectUri || getJobberRedirectUri();
  const body = new URLSearchParams({
    client_id: process.env.JOBBER_CLIENT_ID!.trim(),
    client_secret: process.env.JOBBER_CLIENT_SECRET!.trim(),
    grant_type: "authorization_code",
    code,
    redirect_uri: uri,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[jobber-oauth] token exchange", response.status, text);
    throw new Error("JOBBER_TOKEN_EXCHANGE_FAILED");
  }

  return (await response.json()) as JobberTokenResponse;
}

export async function refreshJobberAccessToken(
  refreshToken: string,
): Promise<JobberTokenResponse> {
  const body = new URLSearchParams({
    client_id: process.env.JOBBER_CLIENT_ID!.trim(),
    client_secret: process.env.JOBBER_CLIENT_SECRET!.trim(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[jobber-oauth] refresh", response.status, text);
    throw new Error("JOBBER_REFRESH_FAILED");
  }

  return (await response.json()) as JobberTokenResponse;
}
