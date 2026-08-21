import crypto from "node:crypto";
import { isValidLsEnvValue } from "@/lib/lemon-squeezy-config";
import { LemonSqueezyApiError, lsFetch } from "@/lib/lemon-squeezy-client";
import { PRO_PRICE_KRW } from "./billing";

type LsCheckoutResponse = {
  data: { id: string; attributes: { url: string } };
};

export function isTossShopLsConfigured(): boolean {
  return (
    isValidLsEnvValue(process.env.LEMON_SQUEEZY_API_KEY) &&
    isValidLsEnvValue(process.env.LEMON_SQUEEZY_STORE_ID) &&
    isValidLsEnvValue(process.env.LEMON_SQUEEZY_VARIANT_ID_TOSS_SHOP_PRO)
  );
}

export function tossShopPublicOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://effiroad.com";
}

/** KRW list price → USD checkout cents for Lemon Squeezy custom_price. */
export function krwToUsdCents(amountKrw: number): number {
  const rate = Number(process.env.TOSS_SHOP_KRW_PER_USD?.trim()) || 1350;
  const usd = amountKrw / rate;
  return Math.max(50, Math.round(usd * 100));
}

export function tossShopLsWebhookSecret(): string | undefined {
  const dedicated = process.env.TOSS_SHOP_LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  if (dedicated) return dedicated;
  return process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
}

export function verifyTossShopLsWebhookSignature(
  rawBody: string,
  header: string | null,
): boolean {
  const secret = tossShopLsWebhookSecret();
  if (!secret || !header) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
  const signature = Buffer.from(header, "utf8");
  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}

export async function createTossShopCheckout(input: {
  accountId: string;
  email: string;
  name: string;
  priceKrw?: number;
}): Promise<{ url: string; checkoutId: string }> {
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID!.trim();
  const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID_TOSS_SHOP_PRO!.trim();
  const priceKrw = input.priceKrw ?? PRO_PRICE_KRW;
  const amountUsdCents = krwToUsdCents(priceKrw);
  const origin = tossShopPublicOrigin();

  try {
    const result = await lsFetch<LsCheckoutResponse>("/checkouts", {
      method: "POST",
      body: {
        data: {
          type: "checkouts",
          attributes: {
            custom_price: amountUsdCents,
            checkout_data: {
              email: input.email,
              name: input.name,
              custom: {
                tossShop: "1",
                tossShopAccountId: input.accountId,
                priceKrw: String(priceKrw),
              },
            },
            product_options: {
              name: "Effiroad 토스쇼핑 Pro",
              description: `토스쇼핑 셀러 도구 Pro · 월 ${priceKrw.toLocaleString("ko-KR")}원`,
              redirect_url: `${origin}/dashboard/settings?checkout=success&plan=pro`,
            },
            checkout_options: {
              embed: false,
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: storeId },
            },
            variant: {
              data: { type: "variants", id: variantId },
            },
          },
        },
      },
    });

    const url = result.data?.attributes?.url?.trim();
    if (!url) throw new Error("Lemon Squeezy checkout URL missing");
    return { url, checkoutId: result.data?.id?.trim() ?? "" };
  } catch (e) {
    if (e instanceof LemonSqueezyApiError) {
      console.error("[toss-shop/ls] checkout failed", e.status, e.body);
    }
    throw e;
  }
}

export type TossShopLsWebhook = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, string> | null;
  };
  data?: {
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

export function accountIdFromLsWebhook(payload: TossShopLsWebhook): string | null {
  const fromCustom = payload.meta?.custom_data?.tossShopAccountId?.trim();
  return fromCustom || null;
}

export function isTossShopLsEvent(payload: TossShopLsWebhook): boolean {
  return payload.meta?.custom_data?.tossShop === "1";
}
