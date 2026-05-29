export function isJobberConfigured(): boolean {
  const id = process.env.JOBBER_CLIENT_ID?.trim();
  const secret = process.env.JOBBER_CLIENT_SECRET?.trim();
  const redirect = getJobberRedirectUri();
  return Boolean(id && secret && redirect);
}

export function getJobberRedirectUri(): string {
  const explicit = process.env.JOBBER_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!base) return "";
  return `${base}/api/jobber/callback`;
}

export function getJobberGraphqlVersion(): string {
  return process.env.JOBBER_GRAPHQL_VERSION?.trim() || "2025-04-16";
}
