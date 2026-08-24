import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";
import { isOwnerEmail } from "../billing";
import { configFromEnv, tossOAuthUrl, type TossApiConfig } from "./config";
import { tossFetch } from "./toss-proxy-fetch";

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

  const res = await tossFetch(tossOAuthUrl(config.sandbox), {
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

/**
 * merchant 자기 키를 최우선으로 쓰고, 없으면 환경변수 키로 폴백한다.
 *
 * ⚠️ env 폴백은 **오너 계정에만** 허용된다.
 * 종전에는 키가 없는 모든 merchant가 TOSS_SHOPPING_* 환경변수 키로 폴백해서,
 * 아무나 가입만 하면 오너의 토스 상점에 상품을 등록하고 주문·정산을 조회할
 * 수 있었다. 가입 시점이 아니라 **매 API 호출마다** 새는 경로였다.
 *
 * 일반 셀러는 설정 → API 연동에서 자기 키를 입력해야 하고, 입력 전에는
 * config가 null이라 라이브 기능이 동작하지 않는다(의도된 동작).
 */
export async function resolveApiConfig(
  merchantId: string,
  merchantKeys?: { accessKey?: string; secretKey?: string; sandbox?: boolean },
  /** 이 merchant를 소유한 계정 이메일 — 오너일 때만 env 키로 폴백한다 */
  accountEmail?: string,
): Promise<TossApiConfig | null> {
  if (merchantKeys?.accessKey && merchantKeys?.secretKey) {
    return {
      accessKey: merchantKeys.accessKey,
      secretKey: merchantKeys.secretKey,
      sandbox: merchantKeys.sandbox ?? false,
      partnerName: "effiroad",
    };
  }
  if (accountEmail && isOwnerEmail(accountEmail)) return configFromEnv();
  return null;
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

  const res = await tossFetch(url.toString(), {
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

  const res = await tossFetch(url.toString(), {
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

export async function tossApiPut<T>(
  merchantId: string,
  config: TossApiConfig,
  path: string,
  body: unknown,
  query?: Record<string, string | number | undefined>,
): Promise<TossApiEnvelope<T>> {
  const token = await getAccessToken(merchantId, config);
  const base = config.sandbox
    ? "https://shopping-fep-alpha.toss.im"
    : "https://shopping-fep.toss.im";
  const url = new URL(path, base);
  url.searchParams.set("partnerName", config.partnerName);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const res = await tossFetch(url.toString(), {
    method: "PUT",
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
