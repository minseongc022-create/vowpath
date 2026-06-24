import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";
import { deleteUserFromStore } from "./users-db";

const TENANT_KEY_PREFIX = "effiroad:";

async function deleteTenantKvKeys(userId: string): Promise<number> {
  if (!useKvStore()) return 0;
  const suffixes = [
    `company-ai-memory:${userId}`,
    `workflow-rules:${userId}`,
    `workflow-booking-tags:${userId}`,
    `requests:${userId}`,
    `call-memory:${userId}`,
    `tenant-events:${userId}`,
    `shop-settings:${userId}`,
    `shop-profile:${userId}`,
    `jobber-tokens:${userId}`,
    `schedule-bookings:${userId}`,
  ];
  let deleted = 0;
  for (const suffix of suffixes) {
    try {
      await kv.del(`${TENANT_KEY_PREFIX}${suffix}`);
      deleted += 1;
    } catch {
      // key may not exist
    }
  }
  return deleted;
}

export async function purgeUserAccount(userId: string): Promise<{ ok: boolean }> {
  const removed = await deleteUserFromStore(userId);
  if (!removed) return { ok: false };
  await deleteTenantKvKeys(userId);
  return { ok: true };
}
