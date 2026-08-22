import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";
import { configFromEnv, tossOAuthUrl, type TossApiConfig } from "./config";

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

const memoryTokens = new Map<string, CachedToken>();

function tokenKey(merchantId: string): string {
  return `toss-shop:api-token:${merchantId}`;
}

export async function getAccessToken(
  merchantId: string,
  config: TossApiConfig,
): Promise<string> {
  const now = Date.now();
  const mem = memoryTokens.get(merchantId);
  if (mem && mem.expiresAt > now + 60_000) return mem.accessToken;

  if (useKvStore()) {
    const cached = await kvGetSafe<CachedToken>(tokenKey(merchantId));
    if (cached && cached.expiresAt > now + 60_000) {
      memoryTokens.set(merchantId, cached);
      return cached.accessToken;
    }
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.accessKey,
    client_secret: config.secretKey,
    scope: "toss-shopping-fep:write",
  });

  const res = await fetch(tossOAuthUrl(config.sandbox), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json; charset=UTF-8",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TOSS_TOKEN_FAILED:${res.status}:${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) throw new Error("TOSS_TOKEN_MISSING");

  const expiresIn = json.expires_in ?? 3600;
  const cached: CachedToken = {
    accessToken: json.access_token,
    expiresAt: now + expiresIn * 1000,
  };
  memoryTokens.set(merchantId, cached);
  if (useKvStore()) {
    await kv.set(tokenKey(merchantId), cached, { ex: Math.max(expiresIn - 120, 60) });
  }
  return cached.accessToken;
}

export async function resolveApiConfig(
  merchantId: string,
  merchantKeys?: { accessKey?: string; secretKey?: string; sandbox?: boolean },
): Promise<TossApiConfig | null> {
  if (merchantKeys?.accessKey && merchantKeys?.secretKey) {
    return {
      accessKey: merchantKeys.accessKey,
      secretKey: merchantKeys.secretKey,
      sandbox: merchantKeys.sandbox ?? false,
      partnerName: "effiroad",
    };
  }
  return configFromEnv();
}

export type TossApiEnvelope<T> = {
  resultType: "SUCCESS" | "FAIL";
  success?: T;
  error?: { errorCode?: string; reason?: string };
};

export async function tossApiGet<T>(
  merchantId: string,
  config: TossApiConfig,
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<TossApiEnvelope<T>> {
  const token = await getAccessToken(merchantId, config);
  const base = config.sandbox
    ? "https://shopping-fep-alpha.toss.im"
    : "https://shopping-fep.toss.im";
  const url = new URL(path, base);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`TOSS_API_HTTP_${res.status}:${path}`);
  }

  return (await res.json()) as TossApiEnvelope<T>;
}

export async function tossApiPost<T>(
  merchantId: string,
  config: TossApiConfig,
  path: string,
  body: unknown,
): Promise<TossApiEnvelope<T>> {
  const token = await getAccessToken(merchantId, config);
  const base = config.sandbox
    ? "https://shopping-fep-alpha.toss.im"
    : "https://shopping-fep.toss.im";
  const url = new URL(path, base);
  url.searchParams.set("partnerName", config.partnerName);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TOSS_API_HTTP_${res.status}:${path}:${text.slice(0, 200)}`);
  }

  return (await res.json()) as TossApiEnvelope<T>;
}
