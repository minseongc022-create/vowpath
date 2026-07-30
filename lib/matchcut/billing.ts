import { isValidLsEnvValue } from "../lemon-squeezy-config";
import { LemonSqueezyApiError, lsFetch } from "../lemon-squeezy-client";
import type { CreditPackId } from "./constants";
import { MATCHCUT_ROUTES, packById } from "./constants";

const VARIANT_ENV: Record<string, string | undefined> = {
  pack_150: process.env.LEMON_SQUEEZY_VARIANT_ID_MATCHCUT_PACK_150,
  pack_500: process.env.LEMON_SQUEEZY_VARIANT_ID_MATCHCUT_PACK_500,
  sub_starter: process.env.LEMON_SQUEEZY_VARIANT_ID_MATCHCUT_SUB_STARTER,
  sub_pro: process.env.LEMON_SQUEEZY_VARIANT_ID_MATCHCUT_SUB_PRO,
  sub_business: process.env.LEMON_SQUEEZY_VARIANT_ID_MATCHCUT_SUB_BUSINESS,
  topup_50: process.env.LEMON_SQUEEZY_VARIANT_ID_MATCHCUT_TOPUP_50,
};

export function matchCutVariantId(packId: CreditPackId): string | undefined {
  return VARIANT_ENV[packId]?.trim() || undefined;
}

export function matchCutPackFromVariantId(variantId: string): CreditPackId | null {
  for (const [packId, envVal] of Object.entries(VARIANT_ENV)) {
    if (envVal?.trim() === variantId) return packId as CreditPackId;
  }
  return null;
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MATCHCUT_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

type LsCheckoutResponse = {
  data: { id: string; attributes: { url: string } };
};

export async function createMatchCutCheckout(params: {
  packId: CreditPackId;
  userId: string;
  email: string;
  name?: string;
}): Promise<{ checkoutId: string; url: string; mode: "live" | "dev" }> {
  const pack = packById(params.packId);
  if (!pack || pack.id === "welcome") {
    throw new Error("INVALID_PACK");
  }

  const variantId = matchCutVariantId(params.packId);
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  const live =
    isValidLsEnvValue(process.env.LEMON_SQUEEZY_API_KEY) &&
    isValidLsEnvValue(storeId) &&
    isValidLsEnvValue(variantId);

  if (!live) {
    if (
      process.env.NODE_ENV !== "production" ||
      process.env.MATCHCUT_DEV_CHECKOUT === "1"
    ) {
      return {
        checkoutId: `dev-${params.packId}`,
        url: `${appBaseUrl()}${MATCHCUT_ROUTES.credits}?dev_checkout=${params.packId}`,
        mode: "dev",
      };
    }
    throw new Error("CHECKOUT_NOT_CONFIGURED");
  }

  const result = await lsFetch<LsCheckoutResponse>("/checkouts", {
    method: "POST",
    body: {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: params.email,
            name: params.name,
            custom: {
              product: "matchcut",
              packId: params.packId,
              userId: params.userId,
            },
          },
          product_options: {
            redirect_url: `${appBaseUrl()}${MATCHCUT_ROUTES.credits}?checkout=success&pack=${params.packId}`,
          },
          checkout_options: { embed: false },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId!.trim() } },
          variant: { data: { type: "variants", id: variantId!.trim() } },
        },
      },
    },
  });

  return {
    checkoutId: result.data.id,
    url: result.data.attributes.url,
    mode: "live",
  };
}

export { LemonSqueezyApiError };
