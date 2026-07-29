import { MatchCutFooter, MatchCutMarketingHeader } from "@/components/matchcut/MatchCutShell";
import { MatchCutPricingPage } from "@/components/matchcut/MatchCutPricing";
import { getMatchCutSession } from "@/lib/matchcut/session";

export default async function PricingPage() {
  const session = await getMatchCutSession();
  return (
    <>
      <MatchCutMarketingHeader session={session} />
      <MatchCutPricingPage session={Boolean(session)} />
      <MatchCutFooter />
    </>
  );
}
