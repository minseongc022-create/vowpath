import { isTenantProductEntitled } from "./tenant-product-access";
import {
  ensurePilotTrial,
  ensurePilotTrialForMappedPhone,
} from "./pilot-trial";
import { resolveTenantUserId } from "./tenant-routing";

/** Retell webhooks/tools: grant pilot trial and allow mapped inbound lines. */
export async function isRetellTenantEntitled(
  userId: string,
  params: { to: string; from?: string },
): Promise<boolean> {
  if (await isTenantProductEntitled(userId)) return true;

  await ensurePilotTrialForMappedPhone(userId, params.to);
  if (await isTenantProductEntitled(userId)) return true;

  if (params.from) {
    await ensurePilotTrialForMappedPhone(userId, params.from);
    if (await isTenantProductEntitled(userId)) return true;
  }

  await ensurePilotTrial(userId);
  if (await isTenantProductEntitled(userId)) return true;

  const mapped = await resolveTenantUserId({
    to: params.to,
    from: params.from,
  });
  return mapped === userId;
}
