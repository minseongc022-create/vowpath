import {
  registerCoupang,
  registerGeneric,
  registerSmartStore,
} from "./register";
import { getMarketConnectionStatuses } from "./types";
import type { ListingInput, MarketChannelId, RegisterResult } from "./types";

export { getMarketConnectionStatuses };
export type { ListingInput, MarketChannelId, RegisterResult };

export async function registerToMarkets(params: {
  channels: MarketChannelId[];
  listing: ListingInput;
}): Promise<RegisterResult[]> {
  const results: RegisterResult[] = [];
  for (const channel of params.channels) {
    if (channel === "coupang") {
      results.push(await registerCoupang(params.listing));
    } else if (channel === "smartstore") {
      results.push(await registerSmartStore(params.listing));
    } else {
      results.push(await registerGeneric(channel, params.listing));
    }
  }
  return results;
}
