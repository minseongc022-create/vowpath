/** Toss Shopping FEP API configuration — keys optional; demo mode when absent. */

export type TossApiConfig = {
  accessKey: string;
  secretKey: string;
  sandbox: boolean;
  partnerName: string;
};

export function tossApiBaseUrl(sandbox: boolean): string {
  return sandbox ? "https://shopping-fep-alpha.toss.im" : "https://shopping-fep.toss.im";
}

export function tossOAuthUrl(sandbox: boolean): string {
  return sandbox ? "https://oauth2-alpha.cert.toss.im/token" : "https://oauth2.cert.toss.im/token";
}

/** Global env fallback (Vercel / server). Per-merchant keys take precedence. */
export function configFromEnv(): TossApiConfig | null {
  const accessKey = process.env.TOSS_SHOPPING_ACCESS_KEY?.trim();
  const secretKey = process.env.TOSS_SHOPPING_SECRET_KEY?.trim();
  if (!accessKey || !secretKey) return null;
  return {
    accessKey,
    secretKey,
    sandbox: process.env.TOSS_SHOPPING_SANDBOX === "1",
    partnerName: process.env.TOSS_SHOPPING_PARTNER_NAME?.trim() || "effiroad",
  };
}

export function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
