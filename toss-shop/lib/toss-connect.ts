import { getAccessToken } from "./api/client";
import type { TossApiConfig } from "./api/config";

export const TOSS_SELLER_CENTER_URL = "https://shopping-seller.toss.im";

export function tossConnectConfig(
  accessKey: string,
  secretKey: string,
  sandbox?: boolean,
): TossApiConfig {
  return {
    accessKey: accessKey.trim(),
    secretKey: secretKey.trim(),
    sandbox: sandbox ?? false,
    partnerName: "sellerpulse",
  };
}

/** Validate seller API keys by requesting an access token. */
export async function validateTossSellerKeys(
  accessKey: string,
  secretKey: string,
  sandbox?: boolean,
): Promise<void> {
  const config = tossConnectConfig(accessKey, secretKey, sandbox);
  await getAccessToken("__validate__", config);
}
