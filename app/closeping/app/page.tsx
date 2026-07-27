import { redirect } from "next/navigation";
import { ClosePingAppShell } from "@/components/closeping/ClosePingShell";
import { ClosePingOverviewClient } from "@/components/closeping/ClosePingOverviewClient";
import { getSession } from "@/lib/session";
import { CLOSEPING_ROUTES } from "@/lib/closeping/constants";

export default async function ClosePingAppHomePage() {
  const session = await getSession();
  if (!session) {
    redirect(CLOSEPING_ROUTES.login);
  }

  return (
    <ClosePingAppShell shopName={session.shopName}>
      <ClosePingOverviewClient />
    </ClosePingAppShell>
  );
}
