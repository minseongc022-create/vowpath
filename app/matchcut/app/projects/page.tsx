import { redirect } from "next/navigation";
import { MatchCutAppShell } from "@/components/matchcut/MatchCutShell";
import { MatchCutProjectsList } from "@/components/matchcut/MatchCutProjectsList";
import { getCreditBalance } from "@/lib/matchcut/credits-store";
import { getMatchCutSession } from "@/lib/matchcut/session";
import { MATCHCUT_ROUTES } from "@/lib/matchcut/constants";

export default async function MatchCutProjectsPage() {
  const session = await getMatchCutSession();
  if (!session) redirect(MATCHCUT_ROUTES.login);

  const credits = await getCreditBalance(session.sub);

  return (
    <MatchCutAppShell displayName={session.displayName} credits={credits.total}>
      <MatchCutProjectsList />
    </MatchCutAppShell>
  );
}
