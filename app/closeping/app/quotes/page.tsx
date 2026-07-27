import { redirect } from "next/navigation";
import { ClosePingAppShell } from "@/components/closeping/ClosePingShell";
import { ClosePingQuotesView } from "@/components/closeping/ClosePingDashboard";
import { getSession } from "@/lib/session";
import { CLOSEPING_ROUTES } from "@/lib/closeping/constants";

export default async function ClosePingQuotesPage() {
  const session = await getSession();
  if (!session) redirect(CLOSEPING_ROUTES.login);

  return (
    <ClosePingAppShell shopName={session.shopName}>
      <ClosePingQuotesView />
    </ClosePingAppShell>
  );
}
