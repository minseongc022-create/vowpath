import crypto from "node:crypto";
import { isValidLsEnvValue } from "@/lib/lemon-squeezy-config";
import { LemonSqueezyApiError, lsFetch } from "@/lib/lemon-squeezy-client";
import { getGiuPublicOrigin } from "./giu-host";

type LsCheckoutResponse = {
  data: { id: string; attributes: { url: string } };
};

export function isGiuLsConfigured(): boolean {
  return (
    isValidLsEnvValue(process.env.LEMON_SQUEEZY_API_KEY) &&
    isValidLsEnvValue(process.env.LEMON_SQUEEZY_STORE_ID) &&
    isValidLsEnvValue(process.env.LEMON_SQUEEZY_VARIANT_ID_GIU)
  );
}

export function giuLsWebhookSecret(): string | undefined {
  const giu = process.env.GIU_LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  if (giu) return giu;
  return process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
}

/** VND list price → USD checkout cents for Lemon Squeezy custom_price. */
export function vndToUsdCents(amountVnd: number): number {
  const rate = Number(process.env.GIU_VND_PER_USD?.trim()) || 25000;
  const usd = amountVnd / rate;
  return Math.max(50, Math.round(usd * 100));
}

export function verifyGiuLsWebhookSignature(
  rawBody: string,
  header: string | null,
): boolean {
  const secret = giuLsWebhookSecret();
  if (!secret || !header) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
  const signature = Buffer.from(header, "utf8");
  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}

export async function createGiuLsCheckout(input: {
  reservationId: string;
  code: string;
  boxTitle: string;
  amountVnd: number;
  amountUsdCents: number;
  customerEmail: string;
  customerName: string;
}): Promise<{ url: string; checkoutId: string }> {
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID!.trim();
  const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID_GIU!.trim();
  const origin = getGiuPublicOrigin();

  try {
    const result = await lsFetch<LsCheckoutResponse>("/checkouts", {
      method: "POST",
      body: {
        data: {
          type: "checkouts",
          attributes: {
            custom_price: input.amountUsdCents,
            checkout_data: {
              email: input.customerEmail,
              name: input.customerName,
              custom: {
                giu: "1",
                reservationId: input.reservationId,
                code: input.code,
                amountVnd: String(input.amountVnd),
                amountUsdCents: String(input.amountUsdCents),
              },
            },
            product_options: {
              name: `Giu — ${input.boxTitle}`.slice(0, 120),
              description: `Food rescue box pickup code ${input.code} · giucuu.com`.slice(
                0,
                250,
              ),
              redirect_url: `${origin}/api/giu/payments/lemon-squeezy/return?reservation_id=${encodeURIComponent(input.reservationId)}`,
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
      console.error("[giu/ls] checkout failed", e.status, e.body);
    }
    throw e;
  }
}

export type GiuLsOrderWebhook = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, string> | null;
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      total?: number;
      total_usd?: number;
      currency?: string;
      refunded?: boolean;
    };
  };
};

export function reservationIdFromLsWebhook(payload: GiuLsOrderWebhook): string | null {
  const fromCustom = payload.meta?.custom_data?.reservationId?.trim();
  return fromCustom || null;
}
