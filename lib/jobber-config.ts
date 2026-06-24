const CALLBACK_PATH = "/api/jobber/callback";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function buildCallbackUrl(origin: string): string {
  return `${normalizeOrigin(origin)}${CALLBACK_PATH}`;
}

/** Resolve app origin from env (Vercel production). */
function resolveEnvOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return normalizeOrigin(explicit);

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  const projectUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (projectUrl) {
    const host = projectUrl.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return null;
}

export function isJobberConfigured(): boolean {
  const id = process.env.JOBBER_CLIENT_ID?.trim();
  const secret = process.env.JOBBER_CLIENT_SECRET?.trim();
  return Boolean(id && secret && getJobberRedirectUri());
}

/** Public OAuth client id (not secret) — matches Jobber Developer Center app. */
export function getJobberClientId(): string {
  return process.env.JOBBER_CLIENT_ID?.trim() || "";
}

/**
 * OAuth redirect URI. Prefer explicit env, then request origin, then Vercel env.
 * Must exactly match Jobber Developer Center → OAuth Callback URL.
 */
export function getJobberRedirectUri(requestOrigin?: string): string {
  const explicit = process.env.JOBBER_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  if (requestOrigin) {
    return buildCallbackUrl(requestOrigin);
  }

  const envOrigin = resolveEnvOrigin();
  if (envOrigin) return buildCallbackUrl(envOrigin);

  return "";
}

export function getJobberOriginFromRequest(request: Request): string {
  const url = new URL(request.url);
  return normalizeOrigin(url.origin);
}

export function getJobberGraphqlVersion(): string {
  return process.env.JOBBER_GRAPHQL_VERSION?.trim() || "2025-04-16";
}

export function getJobberDeveloperPortalUrl(): string {
  return "https://developer.getjobber.com/apps";
}
