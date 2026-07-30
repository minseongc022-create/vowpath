import { redirect } from "next/navigation";
import { MatchCutAppShell } from "@/components/matchcut/MatchCutShell";
import { MatchCutMarketsPanel } from "@/components/matchcut/MatchCutMarketsPanel";
import { getCreditBalance } from "@/lib/matchcut/credits-store";
import { getMatchCutSession } from "@/lib/matchcut/session";
import { MATCHCUT_ROUTES } from "@/lib/matchcut/constants";

export default async function MatchCutMarketsPage() {
  const session = await getMatchCutSession();
  if (!session) redirect(MATCHCUT_ROUTES.login);

  const credits = await getCreditBalance(session.sub);

  return (
    <MatchCutAppShell displayName={session.displayName} credits={credits.total}>
      <MatchCutMarketsPanel initialCredits={credits.total} />
    </MatchCutAppShell>
  );
}
