import { redirect } from "next/navigation";
import { MatchCutAppShell } from "@/components/matchcut/MatchCutShell";
import { MatchCutPricingPage } from "@/components/matchcut/MatchCutPricing";
import { getCreditBalance } from "@/lib/matchcut/credits-store";
import { getMatchCutSession } from "@/lib/matchcut/session";
import { MATCHCUT_ROUTES } from "@/lib/matchcut/constants";

export default async function MatchCutCreditsPage() {
  const session = await getMatchCutSession();
  if (!session) redirect(MATCHCUT_ROUTES.login);

  const credits = await getCreditBalance(session.sub);

  return (
    <MatchCutAppShell displayName={session.displayName} credits={credits.total}>
      <div className="border-b border-slate-200 bg-violet-50/50 px-4 py-4 text-center text-sm">
        보유: <strong>{credits.total}</strong> (구독 {credits.subscriptionCredits} + 영구{" "}
        {credits.permanentCredits})
      </div>
      <MatchCutPricingPage session />
    </MatchCutAppShell>
  );
}
