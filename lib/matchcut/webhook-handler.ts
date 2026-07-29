import { grantCredits } from "./credits-store";
import { matchCutPackFromVariantId } from "./billing";
import { packById, type CreditPackId } from "./constants";
import { findMatchCutUserByEmail, findMatchCutUserById } from "./users-db";

type LsWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown> | null;
  };
  data?: {
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

function isMatchCutPayload(payload: LsWebhookPayload): boolean {
  const custom = payload.meta?.custom_data;
  if (custom?.product === "matchcut") return true;
  const variantId = payload.data?.attributes?.variant_id;
  if (variantId != null && matchCutPackFromVariantId(String(variantId))) return true;
  return false;
}

async function resolveUserId(payload: LsWebhookPayload): Promise<string | null> {
  const custom = payload.meta?.custom_data;
  if (typeof custom?.userId === "string") {
    const u = await findMatchCutUserById(custom.userId);
    if (u) return u.id;
  }
  const attrs = payload.data?.attributes ?? {};
  const email =
    typeof attrs.user_email === "string"
      ? attrs.user_email
      : typeof attrs.customer_email === "string"
        ? attrs.customer_email
        : typeof custom?.email === "string"
          ? custom.email
          : null;
  if (email) {
    const u = await findMatchCutUserByEmail(email);
    if (u) return u.id;
  }
  return null;
}

function resolvePackId(payload: LsWebhookPayload): CreditPackId | null {
  const custom = payload.meta?.custom_data;
  if (typeof custom?.packId === "string") {
    const pack = packById(custom.packId);
    if (pack) return pack.id;
  }
  const variantId = payload.data?.attributes?.variant_id;
  if (variantId != null) return matchCutPackFromVariantId(String(variantId));
  return null;
}

/** Returns true if this webhook was handled as MatchCut (skip Effiroad billing). */
export async function handleMatchCutLemonWebhook(
  payload: LsWebhookPayload,
): Promise<boolean> {
  if (!isMatchCutPayload(payload)) return false;

  const event = payload.meta?.event_name ?? "";
  const grantEvents = new Set([
    "order_created",
    "subscription_created",
    "subscription_payment_success",
    "subscription_updated",
  ]);

  if (!grantEvents.has(event)) {
    console.log("[matchcut/webhook] ignore event", event);
    return true;
  }

  const userId = await resolveUserId(payload);
  const packId = resolvePackId(payload);
  if (!userId || !packId) {
    console.warn("[matchcut/webhook] missing user or pack", { userId, packId, event });
    return true;
  }

  const pack = packById(packId);
  if (!pack) return true;

  const kind = pack.type === "subscription" ? "subscription" : "permanent";
  await grantCredits(userId, pack.credits, kind, pack.type === "subscription" ? pack.id : null);
  console.log("[matchcut/webhook] granted", pack.credits, "to", userId, packId);
  return true;
}
