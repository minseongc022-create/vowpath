/** Public HTTPS base URL for webhooks (Twilio, Jobber redirect, etc.) */
export function getPublicAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv && !fromEnv.includes("localhost")) {
    return fromEnv.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "";
}
