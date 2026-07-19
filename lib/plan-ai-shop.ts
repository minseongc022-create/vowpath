import { findUserById } from "./users-db";
import { chatModelForPlan } from "./plan-ai";

/** Resolve chat/JSON model from a shop (tenant) user id. Defaults to Flex/economy. */
export async function resolveAiModelForShop(shopId: string | undefined | null): Promise<string> {
  if (!shopId) return chatModelForPlan("flex");
  try {
    const user = await findUserById(shopId);
    return chatModelForPlan(user?.plan);
  } catch {
    return chatModelForPlan("flex");
  }
}
