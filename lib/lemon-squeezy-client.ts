export class LemonSqueezyApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "LemonSqueezyApiError";
    this.status = status;
    this.body = body;
  }
}

const LS_API = "https://api.lemonsqueezy.com/v1";

export async function lsFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) throw new Error("LEMON_SQUEEZY_API_KEY not configured");

  const res = await fetch(`${LS_API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new LemonSqueezyApiError(`Lemon Squeezy API error ${res.status}`, res.status, json);
  }
  return json as T;
}

export type LsSubscriptionItem = {
  id: number | string;
  subscription_id: number | string;
  price_id: number | string;
  variant_id?: number | string;
  quantity: number;
};

export type LsSubscription = {
  id: string;
  attributes: {
    store_id: number;
    customer_id: number;
    variant_id: number;
    status: string;
    user_email?: string;
    renews_at?: string | null;
    trial_ends_at?: string | null;
    first_subscription_item?: LsSubscriptionItem | null;
    urls?: {
      customer_portal?: string;
      update_payment_method?: string;
    };
  };
};

export async function fetchSubscription(subscriptionId: string): Promise<LsSubscription | null> {
  try {
    const result = await lsFetch<{ data: LsSubscription }>(`/subscriptions/${subscriptionId}`);
    return result.data ?? null;
  } catch (e) {
    console.warn("[lemon-squeezy] fetch subscription", subscriptionId, e);
    return null;
  }
}

export async function listSubscriptionItems(
  subscriptionId: string,
): Promise<LsSubscriptionItem[]> {
  try {
    const result = await lsFetch<{
      data: Array<{ id: string; attributes: LsSubscriptionItem }>;
    }>(`/subscription-items?filter[subscription_id]=${subscriptionId}`);
    return (result.data ?? []).map((row) => ({
      ...row.attributes,
      id: row.id,
    }));
  } catch (e) {
    console.warn("[lemon-squeezy] list subscription items", subscriptionId, e);
    return [];
  }
}

export async function reportUsageIncrement(
  subscriptionItemId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) return;
  await lsFetch("/usage-records", {
    method: "POST",
    body: {
      data: {
        type: "usage-records",
        attributes: {
          quantity,
          action: "increment",
        },
        relationships: {
          "subscription-item": {
            data: { type: "subscription-items", id: String(subscriptionItemId) },
          },
        },
      },
    },
  });
}

export async function updateSubscriptionVariant(
  subscriptionId: string,
  variantId: string,
): Promise<void> {
  await lsFetch(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    body: {
      data: {
        type: "subscriptions",
        id: subscriptionId,
        attributes: {
          variant_id: Number(variantId),
          disable_prorations: true,
        },
      },
    },
  });
}
