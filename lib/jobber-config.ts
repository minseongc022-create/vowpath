const CALLBACK_PATH = "/api/jobber/callback";
/** Canonical production callback — must match Jobber Developer Center exactly (apex, no www, no trailing slash/space). */
export const JOBBER_PRODUCTION_CALLBACK_URI = `https://effiroad.com${CALLBACK_PATH}`;

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function buildCallbackUrl(origin: string): string {
  return `${normalizeOrigin(origin)}${CALLBACK_PATH}`;
}

function stripAllWhitespace(raw: string): string {
  return raw.replace(/[\s\u00a0\u200b\ufeff]+/g, "");
}

function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
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

function isEffiroadProductionHost(originOrUri: string): boolean {
  try {
    const host = new URL(
      originOrUri.includes("://") ? originOrUri : `https://${originOrUri}`,
    ).hostname.toLowerCase();
    return host === "effiroad.com" || host === "www.effiroad.com";
  } catch {
    return /(?:^|\.)effiroad\.com$/i.test(originOrUri);
  }
}

export function isJobberConfigured(): boolean {
  const id = getJobberClientId();
  const secret = stripAllWhitespace(process.env.JOBBER_CLIENT_SECRET?.trim() || "");
  return Boolean(id && secret && getJobberRedirectUri());
}

/** Public OAuth client id (not secret) — matches Jobber Developer Center app. */
export function getJobberClientId(): string {
  // Jobber rejects client_id with embedded whitespace (copy/paste / line-wrap artifacts).
  return stripAllWhitespace(process.env.JOBBER_CLIENT_ID?.trim() || "");
}

function sanitizeRedirectUri(raw: string): string {
  // Jobber exact-matches redirect_uri — strip ALL whitespace (incl. NBSP) that breaks OAuth.
  return stripAllWhitespace(raw).replace(/\/$/, "");
}

/**
 * OAuth redirect URI. Production Effiroad always sends the canonical apex callback
 * so Jobber Developer Center only needs one exact URL (no www/apex drift, no env typos).
 * Jobber exact-matches this to Developer Center → OAuth Callback URL.
 */
export function getJobberRedirectUri(requestOrigin?: string): string {
  const explicit = sanitizeRedirectUri(process.env.JOBBER_REDIRECT_URI?.trim() || "");

  // Live Effiroad: always apex — never www, never localhost, never a mistyped env URL.
  if (isProductionRuntime()) {
    const envOrigin = resolveEnvOrigin();
    if (
      (envOrigin && isEffiroadProductionHost(envOrigin)) ||
      (explicit && isEffiroadProductionHost(explicit)) ||
      (requestOrigin && isEffiroadProductionHost(requestOrigin))
    ) {
      if (explicit && explicit !== JOBBER_PRODUCTION_CALLBACK_URI) {
        console.warn(
          "[jobber] overriding JOBBER_REDIRECT_URI to canonical apex",
          JSON.stringify(explicit),
          "→",
          JOBBER_PRODUCTION_CALLBACK_URI,
        );
      }
      return JOBBER_PRODUCTION_CALLBACK_URI;
    }
  }

  if (explicit) {
    if (isProductionRuntime() && /localhost|127\.0\.0\.1/i.test(explicit)) {
      console.error(
        "[jobber] JOBBER_REDIRECT_URI points at localhost in production — using",
        JOBBER_PRODUCTION_CALLBACK_URI,
      );
      return JOBBER_PRODUCTION_CALLBACK_URI;
    }
    return explicit;
  }

  const envOrigin = resolveEnvOrigin();
  if (envOrigin) {
    if (isProductionRuntime() && isEffiroadProductionHost(envOrigin)) {
      return JOBBER_PRODUCTION_CALLBACK_URI;
    }
    return buildCallbackUrl(envOrigin);
  }

  if (requestOrigin) {
    const cleaned = sanitizeRedirectUri(requestOrigin);
    if (isProductionRuntime() && isEffiroadProductionHost(cleaned)) {
      return JOBBER_PRODUCTION_CALLBACK_URI;
    }
    return buildCallbackUrl(cleaned);
  }

  return "";
}

/** URLs shops should paste into Jobber Developer Center (exact strings). */
export function getJobberRecommendedCallbackUris(): string[] {
  return [
    JOBBER_PRODUCTION_CALLBACK_URI,
    `https://www.effiroad.com${CALLBACK_PATH}`,
    "http://localhost:3000/api/jobber/callback",
  ];
}

/** True when redirect URI looks safe to send to Jobber (production). */
export function isJobberRedirectUriProductionReady(uri: string): boolean {
  if (!uri) return false;
  if (/localhost|127\.0\.0\.1/i.test(uri)) return false;
  return uri.includes(CALLBACK_PATH);
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
